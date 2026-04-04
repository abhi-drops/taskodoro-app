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

// SVG ring progress
function TimerRing({ progress, type }: { progress: number; type: 'work' | 'break' }) {
  const r = 88;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(1, progress)));

  return (
    <svg viewBox="0 0 200 200" className="w-52 h-52 -rotate-90">
      {/* Track */}
      <circle cx="100" cy="100" r={r} fill="none" strokeWidth="10" className="stroke-muted" />
      {/* Progress */}
      <circle
        cx="100"
        cy="100"
        r={r}
        fill="none"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        className={cn(
          'transition-all duration-1000',
          type === 'work' ? 'stroke-primary' : 'stroke-emerald-500',
        )}
      />
    </svg>
  );
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

  // Alarm on expiry — loop until dismissed
  useEffect(() => {
    if (expired && !alarmFiredRef.current) {
      alarmFiredRef.current = true;
      playAlarmLoop();
    }
  }, [expired]);

  // Stop alarm whenever expired clears
  useEffect(() => {
    if (!expired) stopAlarm();
  }, [expired]);

  // Reset alarm flag when moving to new block
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

  // Next button pressed during active/paused state
  function handleNextPress() {
    // If it's a work block that isn't checked off, ask
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

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button
          onClick={() => { stopAlarm(); onClose(); }}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Close timer"
        >
          <X size={20} />
        </button>
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'text-xs font-semibold px-2.5 py-1 rounded-full',
            block.type === 'work' ? 'bg-primary/10 text-primary' : 'bg-emerald-500/10 text-emerald-600',
          )}>
            {block.type === 'work' ? (
              <span className="flex items-center gap-1"><Zap size={11} />Work</span>
            ) : (
              <span className="flex items-center gap-1"><Coffee size={11} />Break</span>
            )}
          </span>
          <span className="text-xs text-muted-foreground">
            {blockIdx + 1} / {totalBlocks}
          </span>
        </div>
        <button
          onClick={handleRestart}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Restart session"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 min-h-0">
        {/* Task label */}
        <div className="text-center max-w-xs">
          <h2 className="text-xl font-bold leading-tight line-clamp-2">{block.label}</h2>
          {block.type === 'break' && (
            <p className="text-sm text-muted-foreground mt-1">Take a breather</p>
          )}
        </div>

        {/* Ring + time */}
        <div className="relative flex items-center justify-center">
          <TimerRing progress={progress} type={block.type} />
          <div className="absolute flex flex-col items-center">
            <span className={cn(
              'text-5xl font-mono font-bold tabular-nums tracking-tight',
              expired && 'animate-pulse',
            )}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsRunning(r => !r)}
            disabled={expired}
            className="w-14 h-14 rounded-2xl"
            aria-label={isRunning ? 'Pause' : 'Resume'}
          >
            {isRunning ? <Pause size={22} /> : <Play size={22} />}
          </Button>
          <Button
            variant="outline"
            onClick={handleAddFive}
            className="h-14 px-5 rounded-2xl gap-2 text-sm font-semibold"
          >
            <Plus size={16} />
            5 min
          </Button>
          <Button
            variant="outline"
            onClick={handleNextPress}
            className="h-14 px-5 rounded-2xl gap-2 text-sm font-semibold"
            aria-label="Next block"
          >
            <SkipForward size={16} />
            Next
          </Button>
        </div>
      </div>

      {/* Next confirm overlay — asks to check off work task */}
      {showNextConfirm && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm px-6 gap-5">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Check size={28} className="text-primary" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold">Mark as done?</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-[260px]">
              "{block.label}" isn't checked off yet. Do you want to complete it before moving on?
            </p>
          </div>
          <div className="flex flex-col gap-2.5 w-full max-w-xs">
            <Button onClick={handleCheckOffAndNext} className="h-12 gap-2 rounded-xl font-semibold">
              <Check size={16} />
              Check off & continue
            </Button>
            <Button
              onClick={() => { setShowNextConfirm(false); handleNext(); }}
              variant="outline"
              className="h-12 gap-2 rounded-xl"
            >
              <SkipForward size={16} />
              Skip & continue
            </Button>
            <Button
              onClick={() => setShowNextConfirm(false)}
              variant="ghost"
              className="h-11 text-muted-foreground rounded-xl"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Time's Up overlay */}
      {expired && !showNextConfirm && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm px-6 gap-5">
          <div className={cn(
            'w-20 h-20 rounded-full flex items-center justify-center',
            block.type === 'work' ? 'bg-primary/10' : 'bg-emerald-500/10',
          )}>
            <span className="text-4xl">⏰</span>
          </div>
          <div className="text-center">
            <h3 className="text-2xl font-bold">Time's Up!</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-[240px]">
              {block.type === 'work' ? `Finished: ${block.label}` : 'Break over!'}
            </p>
          </div>
          <div className="flex flex-col gap-2.5 w-full max-w-xs">
            <Button onClick={handleAddFive} variant="outline" className="h-12 gap-2 rounded-xl">
              <Plus size={16} />
              Add 5 minutes
            </Button>
            {block.type === 'work' && (
              <Button onClick={handleCheckOffAndNext} className="h-12 gap-2 rounded-xl font-semibold">
                <Check size={16} />
                Check off & continue
              </Button>
            )}
            <Button
              onClick={handleNext}
              variant={block.type === 'break' ? 'default' : 'outline'}
              className="h-12 gap-2 rounded-xl"
            >
              {blockIdx + 1 < blocks.length ? 'Next block →' : 'Finish session'}
            </Button>
            <Button onClick={onClose} variant="ghost" className="h-11 text-muted-foreground rounded-xl">
              Close timer
            </Button>
          </div>
        </div>
      )}

      {/* Task checklist */}
      {workBlocks.length > 0 && !expired && !showNextConfirm && (
        <div className="shrink-0 border-t border-border px-4 pt-3 pb-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tasks</p>
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
                      isActive ? 'bg-primary/10' : 'hover:bg-muted',
                    )}
                  >
                    <span
                      className={cn(
                        'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors',
                        b.completed ? 'border-primary bg-primary' : 'border-border',
                      )}
                    >
                      {b.completed && (
                        <svg viewBox="0 0 10 8" className="w-3 h-3 text-primary-foreground fill-current">
                          <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span className={cn(
                      'flex-1 truncate font-medium',
                      b.completed && 'line-through text-muted-foreground',
                      isActive && 'text-primary',
                    )}>
                      {b.label}
                    </span>
                    {isActive && (
                      <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-semibold shrink-0">
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
