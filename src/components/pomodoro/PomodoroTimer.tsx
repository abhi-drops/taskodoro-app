import { useState, useEffect, useRef, useCallback } from 'react';
import { X, RotateCcw, Pause, Play, Plus, Check, Coffee, Zap, SkipForward } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { cn } from '@/lib/utils';
import type { PomodoroBlock } from '@/types/pomodoro';
import type { AppAction } from '@/store/useAppStore';
import { M3LinearProgress } from './M3LinearProgress';
import { AlarmSound } from '@/plugins/AlarmSound';
import { PomodoroNative } from '@/plugins/PomodoroTimer';
import type { PomodoroState, PomodoroEvent } from '@/plugins/PomodoroTimer';

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
  const isAndroid = Capacitor.getPlatform() === 'android';
  const nativeActiveRef = useRef(false);
  // Refs so native listener callbacks always see current values without re-registering
  const blocksRef = useRef(blocks);
  const blockIdxRef = useRef(blockIdx);
  const onCloseRef = useRef(onClose);

  useEffect(() => { blocksRef.current = blocks; }, [blocks]);
  useEffect(() => { blockIdxRef.current = blockIdx; }, [blockIdx]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

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

  // ── Android Foreground Service integration ──────────────────────────────

  // Start native service on mount; stop it when timer closes
  useEffect(() => {
    if (!isAndroid) return;
    PomodoroNative.requestNotificationPermission().catch(() => {});
    PomodoroNative.start({
      blocks: initialBlocks.map(b => ({
        id: b.id, type: b.type, label: b.label, durationMins: b.durationMins,
        taskId: b.taskId, groupId: b.groupId, completed: b.completed,
      })),
      blockIdx: 0,
      timeLeftSeconds: (initialBlocks[0]?.durationMins ?? 0) * 60,
    }).catch(console.error);
    nativeActiveRef.current = true;
    return () => {
      if (nativeActiveRef.current) {
        PomodoroNative.stop().catch(() => {});
        nativeActiveRef.current = false;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for events fired by native service (notification buttons, expiry).
  // Registered once on mount — reads blocks/onClose via refs to avoid re-registering.
  useEffect(() => {
    if (!isAndroid) return;
    const p = PomodoroNative.addListener('timerEvent', (event: PomodoroEvent) => {
      switch (event.eventType) {
        case 'blockExpired':
          if (!alarmFiredRef.current) { alarmFiredRef.current = true; playAlarmLoop(); }
          setExpired(true);
          setIsRunning(false);
          break;
        case 'blockAdvanced':
          stopAlarm();
          if (event.blockIdx !== undefined) {
            setBlockIdx(event.blockIdx);
            setTimeLeft((blocksRef.current[event.blockIdx]?.durationMins ?? 0) * 60);
          }
          setIsRunning(true);
          setExpired(false);
          break;
        case 'sessionEnded':
          stopAlarm();
          nativeActiveRef.current = false;
          onCloseRef.current();
          break;
        case 'pauseChanged':
          setIsRunning(event.isRunning ?? false);
          break;
        case 'addedFive':
          stopAlarm();
          setExpired(false);
          setTimeLeft(t => t + 300);
          setIsRunning(true);
          break;
      }
    });
    return () => { p.then(h => h.remove()); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAndroid]);

  // Re-sync React state from native when app returns to foreground.
  // Registered once — reads blockIdx via ref to avoid re-registering on every block advance.
  useEffect(() => {
    if (!isAndroid) return;
    const p = App.addListener('appStateChange', ({ isActive }: { isActive: boolean }) => {
      if (isActive && nativeActiveRef.current) {
        PomodoroNative.getState().then((s: PomodoroState) => {
          if (s.blockIdx !== blockIdxRef.current) setBlockIdx(s.blockIdx);
          setTimeLeft(s.timeLeftSeconds);
          setIsRunning(s.isRunning);
          if (s.isExpired && !alarmFiredRef.current) {
            alarmFiredRef.current = true;
            playAlarmLoop();
          }
          if (!s.isExpired) setExpired(false);
        }).catch(() => {});
      }
    });
    return () => { p.then(h => h.remove()); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAndroid]);

  const goToBlock = useCallback((idx: number) => {
    if (idx < 0 || idx >= blocks.length) return;
    stopAlarm();
    setBlockIdx(idx);
    setTimeLeft(blocks[idx].durationMins * 60);
    setIsRunning(true);
    setExpired(false);
    setShowNextConfirm(false);
    if (isAndroid && nativeActiveRef.current) {
      PomodoroNative.nextBlock().catch(() => {});
    }
  }, [blocks, isAndroid]);

  function handleAddFive() {
    stopAlarm();
    setTimeLeft(prev => prev + 300);
    if (expired) {
      setExpired(false);
      setIsRunning(true);
    }
    if (isAndroid && nativeActiveRef.current) {
      PomodoroNative.addFive().catch(() => {});
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
      if (isAndroid && nativeActiveRef.current) {
        PomodoroNative.nextBlock().catch(() => {});
      }
    } else {
      if (isAndroid && nativeActiveRef.current) {
        PomodoroNative.stop().catch(() => {});
        nativeActiveRef.current = false;
      }
      onClose();
    }
  }

  function handleNext() {
    if (blockIdx + 1 < blocks.length) {
      goToBlock(blockIdx + 1);
    } else {
      if (isAndroid && nativeActiveRef.current) {
        PomodoroNative.stop().catch(() => {});
        nativeActiveRef.current = false;
      }
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
    if (isAndroid && nativeActiveRef.current) {
      PomodoroNative.stop().catch(() => {});
      setTimeout(() => {
        PomodoroNative.start({
          blocks: reset.map(b => ({
            id: b.id, type: b.type, label: b.label, durationMins: b.durationMins,
            taskId: b.taskId, groupId: b.groupId, completed: b.completed,
          })),
          blockIdx: 0,
          timeLeftSeconds: (reset[0]?.durationMins ?? 0) * 60,
        }).catch(() => {});
      }, 100);
    }
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
          onClick={() => {
            stopAlarm();
            if (isAndroid && nativeActiveRef.current) {
              PomodoroNative.stop().catch(() => {});
              nativeActiveRef.current = false;
            }
            onClose();
          }}
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

        {/* Progress bar — M3 Expressive linear progress */}
        <div className="w-full max-w-xs">
          <M3LinearProgress value={progressPct / 100} isWork={isWork} isRunning={isRunning} expired={expired} />
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
            onClick={() => {
              const next = !isRunning;
              setIsRunning(next);
              if (isAndroid && nativeActiveRef.current) {
                (next ? PomodoroNative.resume() : PomodoroNative.pause()).catch(() => {});
              }
            }}
            disabled={expired}
            className={cn(
              'btn-spring flex items-center justify-center',
              isWork
                ? 'bg-primary text-white shadow-lg shadow-primary/40'
                : 'bg-secondary text-secondary-foreground shadow-lg shadow-secondary/40',
              expired && 'opacity-40',
            )}
            style={{
              width: '4rem',
              height: '4rem',
              borderRadius: isRunning ? '1rem' : '50%',
              transition: 'border-radius 400ms cubic-bezier(0.34, 1.56, 0.64, 1), width 400ms cubic-bezier(0.34, 1.56, 0.64, 1), height 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
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
              onClick={() => {
                stopAlarm();
                if (isAndroid && nativeActiveRef.current) {
                  PomodoroNative.stop().catch(() => {});
                  nativeActiveRef.current = false;
                }
                onClose();
              }}
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
