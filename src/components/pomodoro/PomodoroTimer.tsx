import { useState, useEffect, useRef, useCallback } from 'react';
import { X, RotateCcw, Pause, Play, Plus, Check, Coffee, Zap, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { PomodoroBlock } from '@/types/pomodoro';
import type { AppAction } from '@/store/useAppStore';
import { AlarmSound } from '@/plugins/AlarmSound';

interface Props {
  blocks: PomodoroBlock[];
  workspaceId: string;
  onClose: () => void;
  dispatch: React.Dispatch<AppAction>;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function stopAlarm() {
  AlarmSound.stop().catch(() => { /* ignore */ });
}

function playAlarmLoop() {
  AlarmSound.start().catch(() => { /* ignore */ });
}

export function PomodoroTimer({ blocks: initialBlocks, workspaceId, onClose, dispatch }: Props) {
  const [blocks, setBlocks] = useState<PomodoroBlock[]>(initialBlocks);
  const [blockIdx, setBlockIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState((initialBlocks[0]?.durationMins ?? 0) * 60);
  const [isRunning, setIsRunning] = useState(true);
  const [expired, setExpired] = useState(false);
  const [showNextConfirm, setShowNextConfirm] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alarmFiredRef = useRef(false);

  const block = blocks[blockIdx] ?? null;
  const totalBlocks = blocks.length;
  const workBlocks = blocks.filter(b => b.type === 'work');
  const initialDuration = block ? block.durationMins * 60 : 1;
  const progress = timeLeft / initialDuration;
  const isWork = block?.type === 'work';

  // Tick
  useEffect(() => {
    if (!isRunning || expired) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setIsRunning(false);
          setExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, expired, blockIdx]);

  // Alarm on expiry
  useEffect(() => {
    if (expired && !alarmFiredRef.current) {
      alarmFiredRef.current = true;
      playAlarmLoop();
    }
  }, [expired]);

  useEffect(() => {
    if (!expired) stopAlarm();
  }, [expired]);

  useEffect(() => {
    alarmFiredRef.current = false;
  }, [blockIdx]);

  const goToBlock = useCallback((idx: number) => {
    if (idx < 0 || idx >= blocks.length) return;
    stopAlarm();
    setBlockIdx(idx);
    setTimeLeft(blocks[idx].durationMins * 60);
    setIsRunning(true);
    setExpired(false);
    setShowNextConfirm(false);
  }, [blocks]);

  function handleAddFive() {
    stopAlarm();
    setTimeLeft(prev => prev + 300);
    if (expired) {
      setExpired(false);
      setIsRunning(true);
    }
  }

  function handleCheckOffAndNext() {
    if (!block) return;
    if (block.type === 'work' && block.taskId && block.groupId) {
      dispatch({
        type: 'TOGGLE_TODO',
        payload: { workspaceId, groupId: block.groupId, todoId: block.taskId },
      });
    }
    const updated = blocks.map((b, i) => i === blockIdx ? { ...b, completed: true } : b);
    setBlocks(updated);
    setShowNextConfirm(false);
    if (blockIdx + 1 < blocks.length) {
      const nextIdx = blockIdx + 1;
      setBlockIdx(nextIdx);
      setTimeLeft(updated[nextIdx].durationMins * 60);
      setIsRunning(true);
      setExpired(false);
    } else {
      onClose();
    }
  }

  function handleNext() {
    if (blockIdx + 1 < blocks.length) {
      goToBlock(blockIdx + 1);
    } else {
      onClose();
    }
  }

  function handleNextPress() {
    if (block?.type === 'work' && !block.completed) {
      setShowNextConfirm(true);
    } else {
      handleNext();
    }
  }

  function handleRestart() {
    stopAlarm();
    const reset = initialBlocks.map(b => ({ ...b, completed: false }));
    setBlocks(reset);
    setBlockIdx(0);
    setTimeLeft((reset[0]?.durationMins ?? 0) * 60);
    setIsRunning(true);
    setExpired(false);
    setShowNextConfirm(false);
  }

  function handleChecklistToggle(b: PomodoroBlock) {
    if (!b.taskId || !b.groupId) return;
    dispatch({
      type: 'TOGGLE_TODO',
      payload: { workspaceId, groupId: b.groupId, todoId: b.taskId },
    });
    setBlocks(prev => prev.map(pb => pb.id === b.id ? { ...pb, completed: !pb.completed } : pb));
  }

  if (!block) return null;

  // Progress bar width %
  const progressPct = Math.max(0, Math.min(100, progress * 100));

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: isWork
          ? 'linear-gradient(160deg, oklch(0.14 0.03 30) 0%, oklch(0.08 0.01 30) 100%)'
          : 'linear-gradient(160deg, oklch(0.14 0.03 90) 0%, oklch(0.08 0.01 90) 100%)',
      }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button
          onClick={() => { stopAlarm(); onClose(); }}
          className="btn-spring-icon w-10 h-10 flex items-center justify-center bg-white/10 text-white/60 hover:text-white hover:bg-white/20"
          aria-label="Close timer"
        >
          <X size={18} />
        </button>

        {/* Block dots */}
        <div className="flex items-center gap-1.5">
          {blocks.map((b, i) => (
            <button
              key={b.id}
              onClick={() => goToBlock(i)}
              className={cn(
                'rounded-full transition-all duration-300',
                i === blockIdx
                  ? 'w-6 h-2.5 bg-white'
                  : b.completed
                  ? 'w-2.5 h-2.5 bg-white/40'
                  : 'w-2.5 h-2.5 bg-white/15',
              )}
            />
          ))}
        </div>

        <button
          onClick={handleRestart}
          className="btn-spring-icon w-10 h-10 flex items-center justify-center bg-white/10 text-white/60 hover:text-white hover:bg-white/20"
          aria-label="Restart session"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6 min-h-0">

        {/* Mode badge */}
        <div className={cn(
          'flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold uppercase tracking-widest',
          isWork
            ? 'bg-primary text-white'
            : 'bg-secondary text-secondary-foreground',
        )}>
          {isWork ? <Zap size={14} /> : <Coffee size={14} />}
          {isWork ? 'Work Session' : 'Break Time'}
        </div>

        {/* Time display */}
        <div className="flex flex-col items-center gap-3">
          <span className={cn(
            'font-mono font-black tracking-tighter text-white leading-none',
            expired && 'animate-pulse',
          )}
          style={{ fontSize: 'clamp(4rem, 22vw, 7rem)' }}
          >
            {formatTime(timeLeft)}
          </span>
          <p className="text-white/50 text-sm font-medium text-center line-clamp-1 max-w-[220px]">
            {block.label}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-xs">
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-1000',
                isWork
                  ? 'bg-gradient-to-r from-primary to-orange-400'
                  : 'bg-gradient-to-r from-secondary to-yellow-300',
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-white/30 font-mono">
              {Math.round((1 - progress) * block.durationMins)}m elapsed
            </span>
            <span className="text-xs text-white/30 font-mono">
              {blockIdx + 1}/{totalBlocks}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsRunning(r => !r)}
            disabled={expired}
            className={cn(
              'btn-spring w-16 h-16 flex items-center justify-center',
              isWork
                ? 'bg-primary text-white shadow-lg shadow-primary/40'
                : 'bg-secondary text-secondary-foreground shadow-lg shadow-secondary/40',
              expired && 'opacity-40',
            )}
            aria-label={isRunning ? 'Pause' : 'Resume'}
          >
            {isRunning ? <Pause size={24} /> : <Play size={24} />}
          </button>

          <button
            onClick={handleAddFive}
            className="btn-spring h-14 px-5 bg-white/10 text-white font-semibold text-sm flex items-center gap-2 hover:bg-white/20"
          >
            <Plus size={16} />
            5 min
          </button>

          <button
            onClick={handleNextPress}
            className="btn-spring h-14 px-5 bg-white/10 text-white font-semibold text-sm flex items-center gap-2 hover:bg-white/20"
            aria-label="Next block"
          >
            <SkipForward size={16} />
            Next
          </button>
        </div>
      </div>

      {/* Next confirm overlay */}
      {showNextConfirm && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 gap-5"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}>
          <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
            <Check size={28} className="text-primary" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold text-white">Mark as done?</h3>
            <p className="text-white/50 text-sm mt-1 max-w-[260px]">
              "{block.label}" isn't checked off yet. Complete it before moving on?
            </p>
          </div>
          <div className="flex flex-col gap-2.5 w-full max-w-xs">
            <button
              onClick={handleCheckOffAndNext}
              className="btn-spring h-12 bg-primary text-white font-semibold flex items-center justify-center gap-2"
            >
              <Check size={16} />
              Check off &amp; continue
            </button>
            <button
              onClick={() => { setShowNextConfirm(false); handleNext(); }}
              className="btn-spring h-12 bg-white/10 text-white font-medium flex items-center justify-center gap-2 hover:bg-white/20"
            >
              <SkipForward size={16} />
              Skip &amp; continue
            </button>
            <button
              onClick={() => setShowNextConfirm(false)}
              className="btn-spring h-11 text-white/40 font-medium hover:text-white/60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Time's Up overlay */}
      {expired && !showNextConfirm && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 gap-5"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}>
          <div className={cn(
            'w-20 h-20 rounded-full flex items-center justify-center border-2',
            isWork ? 'bg-primary/20 border-primary/50' : 'bg-secondary/20 border-secondary/50',
          )}>
            <span className="text-4xl">⏰</span>
          </div>
          <div className="text-center">
            <h3 className="text-3xl font-black text-white">Time's Up!</h3>
            <p className="text-white/50 text-sm mt-1 max-w-[240px]">
              {isWork ? `Finished: ${block.label}` : 'Break over — back to it!'}
            </p>
          </div>
          <div className="flex flex-col gap-2.5 w-full max-w-xs">
            <button
              onClick={handleAddFive}
              className="btn-spring h-12 bg-white/10 text-white font-medium flex items-center justify-center gap-2 hover:bg-white/20"
            >
              <Plus size={16} />
              Add 5 minutes
            </button>
            {isWork && (
              <button
                onClick={handleCheckOffAndNext}
                className="h-12 rounded-xl bg-primary text-white font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Check size={16} />
                Check off &amp; continue
              </button>
            )}
            <button
              onClick={handleNext}
              className={cn(
                'btn-spring h-12 font-semibold flex items-center justify-center gap-2',
                !isWork ? 'bg-secondary text-secondary-foreground' : 'bg-white/10 text-white hover:bg-white/20',
              )}
            >
              {blockIdx + 1 < blocks.length ? 'Next block →' : 'Finish session'}
            </button>
            <button
              onClick={onClose}
              className="btn-spring h-11 text-white/40 font-medium hover:text-white/60"
            >
              Close timer
            </button>
          </div>
        </div>
      )}

      {/* Task checklist */}
      {workBlocks.length > 0 && !expired && !showNextConfirm && (
        <div
          className="shrink-0 border-t border-white/10 px-4 pt-3"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
        >
          <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-2">Tasks</p>
          <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto no-scrollbar">
            {blocks
              .filter(b => b.type === 'work')
              .map((b) => {
                const isActive = b.id === block.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => handleChecklistToggle(b)}
                    className={cn(
                      'flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl transition-colors text-sm',
                      isActive ? 'bg-white/10' : 'hover:bg-white/5',
                    )}
                  >
                    <span
                      className={cn(
                        'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors',
                        b.completed ? 'border-primary bg-primary' : 'border-white/20',
                      )}
                    >
                      {b.completed && (
                        <svg viewBox="0 0 10 8" className="w-3 h-3 text-white fill-current">
                          <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span className={cn(
                      'flex-1 truncate font-medium text-white',
                      b.completed && 'line-through text-white/30',
                    )}>
                      {b.label}
                    </span>
                    {isActive && (
                      <span className="text-xs bg-primary text-white px-1.5 py-0.5 rounded-full font-bold shrink-0">
                        Now
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
