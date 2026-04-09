import { useState, useMemo } from 'react';
import { X, Search, ChevronUp, ChevronDown, Trash2, Plus, ArrowLeft, Timer, Zap, Coffee } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Workspace, Todo } from '@/types/index';
import type { PomodoroBlock } from '@/types/pomodoro';

interface SelectedTask {
  todo: Todo;
  groupId: string;
  groupName: string;
}

interface Props {
  workspace: Workspace;
  onClose: () => void;
  onStart: (blocks: PomodoroBlock[]) => void;
}

const WORK_OPTIONS = [10, 15, 20, 25, 30, 45];
const BREAK_OPTIONS = [5, 10, 15];

function generatePlan(tasks: SelectedTask[], workMins: number, breakMins: number): PomodoroBlock[] {
  const blocks: PomodoroBlock[] = [];
  tasks.forEach((t, i) => {
    blocks.push({
      id: crypto.randomUUID(),
      type: 'work',
      label: t.todo.text,
      durationMins: workMins,
      taskId: t.todo.id,
      groupId: t.groupId,
      completed: false,
    });
    if (i < tasks.length - 1) {
      blocks.push({
        id: crypto.randomUUID(),
        type: 'break',
        label: 'Break',
        durationMins: breakMins,
        completed: false,
      });
    }
  });
  return blocks;
}

// ─── Step 1 ───────────────────────────────────────────────────────────────────

interface Step1Props {
  workspace: Workspace;
  selected: SelectedTask[];
  workMins: number;
  breakMins: number;
  onToggleTask: (task: SelectedTask) => void;
  onSetWork: (m: number) => void;
  onSetBreak: (m: number) => void;
  onGenerate: () => void;
}

function Step1({ workspace, selected, workMins, breakMins, onToggleTask, onSetWork, onSetBreak, onGenerate }: Step1Props) {
  const [query, setQuery] = useState('');

  const allTasks = useMemo(() => {
    return workspace.groups.flatMap(g =>
      g.todos.map(t => ({ todo: t, groupId: g.id, groupName: g.name })),
    );
  }, [workspace.groups]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return q ? allTasks.filter(t => t.todo.text.toLowerCase().includes(q)) : allTasks;
  }, [allTasks, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, { groupName: string; tasks: SelectedTask[] }>();
    filtered.forEach(t => {
      if (!map.has(t.groupId)) map.set(t.groupId, { groupName: t.groupName, tasks: [] });
      map.get(t.groupId)!.tasks.push(t);
    });
    return Array.from(map.values());
  }, [filtered]);

  const isSelected = (id: string) => selected.some(s => s.todo.id === id);

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4 p-4">
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search tasks…"
          autoFocus
          className="w-full h-11 rounded-2xl bg-white/8 border border-white/10 text-white text-sm pl-10 pr-4 placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-white/12 transition-all"
        />
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto min-h-0 -mx-4 px-4">
        {grouped.length === 0 ? (
          <p className="text-sm text-white/30 text-center py-8">No tasks found</p>
        ) : (
          <div className="flex flex-col gap-4">
            {grouped.map(({ groupName, tasks }) => (
              <div key={groupName}>
                <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-2 px-1">{groupName}</p>
                <div className="flex flex-col gap-1">
                  {tasks.map(t => {
                    const active = isSelected(t.todo.id);
                    return (
                      <button
                        key={t.todo.id}
                        onClick={() => onToggleTask(t)}
                        className={cn(
                          'flex items-center gap-3 w-full text-left px-3 py-3 rounded-2xl transition-all text-sm active:scale-[0.98]',
                          active
                            ? 'bg-primary/15 border border-primary/30'
                            : 'bg-white/5 border border-white/8 hover:bg-white/10',
                        )}
                      >
                        <span className={cn(
                          'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors',
                          active ? 'border-primary bg-primary' : 'border-white/20',
                        )}>
                          {active && (
                            <svg viewBox="0 0 10 8" className="w-3 h-3 text-white fill-current">
                              <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        <span className={cn(
                          'flex-1 truncate font-medium',
                          active ? 'text-white' : 'text-white/70',
                          t.todo.completed && 'line-through text-white/25',
                        )}>
                          {t.todo.text}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {selected.map(s => (
            <span key={s.todo.id} className="flex items-center gap-1 bg-primary/15 border border-primary/30 text-primary text-xs font-semibold px-2.5 py-1 rounded-full max-w-[180px]">
              <span className="truncate">{s.todo.text}</span>
              <button onClick={() => onToggleTask(s)} className="shrink-0 hover:text-red-400">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Duration selectors */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Zap size={11} /> Work
          </p>
          <div className="flex flex-wrap gap-1.5">
            {WORK_OPTIONS.map(m => (
              <button
                key={m}
                onClick={() => onSetWork(m)}
                className={cn(
                  'px-2.5 py-1.5 rounded-xl text-sm font-semibold transition-all active:scale-95',
                  workMins === m
                    ? 'bg-primary text-white shadow-md shadow-primary/30'
                    : 'bg-white/8 text-white/40 hover:text-white hover:bg-white/15',
                )}
              >
                {m}m
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Coffee size={11} /> Break
          </p>
          <div className="flex flex-wrap gap-1.5">
            {BREAK_OPTIONS.map(m => (
              <button
                key={m}
                onClick={() => onSetBreak(m)}
                className={cn(
                  'px-2.5 py-1.5 rounded-xl text-sm font-semibold transition-all active:scale-95',
                  breakMins === m
                    ? 'bg-secondary text-secondary-foreground shadow-md'
                    : 'bg-white/8 text-white/40 hover:text-white hover:bg-white/15',
                )}
              >
                {m}m
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={onGenerate}
        disabled={selected.length === 0}
        className="w-full h-12 rounded-2xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-30 active:scale-[0.98] transition-all shadow-lg shadow-primary/30"
      >
        <Timer size={16} />
        Generate Plan ({selected.length} task{selected.length !== 1 ? 's' : ''})
      </button>
    </div>
  );
}

// ─── Step 2 ───────────────────────────────────────────────────────────────────

interface Step2Props {
  blocks: PomodoroBlock[];
  onChange: (blocks: PomodoroBlock[]) => void;
  onBack: () => void;
  onStart: () => void;
}

function Step2({ blocks, onChange, onBack, onStart }: Step2Props) {
  const totalMins = blocks.reduce((s, b) => s + b.durationMins, 0);

  function update(id: string, patch: Partial<PomodoroBlock>) {
    onChange(blocks.map(b => (b.id === id ? { ...b, ...patch } : b)));
  }

  function remove(id: string) {
    onChange(blocks.filter(b => b.id !== id));
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    const next = [...blocks];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
  }

  function moveDown(idx: number) {
    if (idx === blocks.length - 1) return;
    const next = [...blocks];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(next);
  }

  function addBlock() {
    onChange([...blocks, {
      id: crypto.randomUUID(),
      type: 'work',
      label: 'New task',
      durationMins: 25,
      completed: false,
    }]);
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3 p-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-white/30 uppercase tracking-widest">{blocks.length} blocks</span>
        <span className="text-xs font-bold text-white/30 uppercase tracking-widest">{totalMins}m total</span>
      </div>

      {/* Block list */}
      <div className="flex-1 overflow-y-auto min-h-0 -mx-4 px-4 flex flex-col gap-2">
        {blocks.map((block, idx) => (
          <div
            key={block.id}
            className={cn(
              'flex items-center gap-2 p-3 rounded-2xl border',
              block.type === 'work'
                ? 'border-primary/20 bg-primary/8'
                : 'border-secondary/20 bg-secondary/8',
            )}
          >
            {/* Up/Down */}
            <div className="flex flex-col gap-0.5 shrink-0">
              <button
                onClick={() => moveUp(idx)}
                disabled={idx === 0}
                className="p-0.5 rounded-lg text-white/25 hover:text-white disabled:opacity-20"
              >
                <ChevronUp size={13} />
              </button>
              <button
                onClick={() => moveDown(idx)}
                disabled={idx === blocks.length - 1}
                className="p-0.5 rounded-lg text-white/25 hover:text-white disabled:opacity-20"
              >
                <ChevronDown size={13} />
              </button>
            </div>

            {/* Type toggle */}
            <button
              onClick={() => update(block.id, { type: block.type === 'work' ? 'break' : 'work' })}
              className={cn(
                'shrink-0 text-xs font-bold px-2.5 py-1 rounded-full transition-colors flex items-center gap-1',
                block.type === 'work'
                  ? 'bg-primary/20 text-primary'
                  : 'bg-secondary/30 text-secondary-foreground',
              )}
            >
              {block.type === 'work' ? <><Zap size={10} />Work</> : <><Coffee size={10} />Break</>}
            </button>

            {/* Label */}
            <input
              value={block.label}
              onChange={e => update(block.id, { label: e.target.value })}
              className="flex-1 min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-white/25"
              placeholder="Label…"
            />

            {/* Duration */}
            <div className="flex items-center gap-1 shrink-0">
              <input
                type="number"
                min={1}
                max={120}
                value={block.durationMins}
                onChange={e => update(block.id, { durationMins: Math.max(1, Number(e.target.value)) })}
                className="w-9 bg-transparent text-sm text-center text-white outline-none"
              />
              <span className="text-xs text-white/30">m</span>
            </div>

            {/* Delete */}
            <button
              onClick={() => remove(block.id)}
              className="shrink-0 text-white/20 hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        <button
          onClick={addBlock}
          className="flex items-center gap-2 w-full px-4 py-3 rounded-2xl border border-dashed border-white/10 text-sm text-white/30 hover:text-white hover:border-white/25 transition-colors"
        >
          <Plus size={14} />
          Add block
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 h-12 px-5 rounded-2xl bg-white/8 text-white/60 font-semibold text-sm hover:bg-white/15 hover:text-white transition-colors active:scale-95"
        >
          <ArrowLeft size={15} />
          Back
        </button>
        <button
          onClick={onStart}
          disabled={blocks.length === 0}
          className="flex-1 h-12 rounded-2xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-30 active:scale-[0.98] transition-all shadow-lg shadow-primary/30"
        >
          <Timer size={16} />
          Start Session
        </button>
      </div>
    </div>
  );
}

// ─── PomodoroPlanner (root) ───────────────────────────────────────────────────

export function PomodoroPlanner({ workspace, onClose, onStart }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<SelectedTask[]>([]);
  const [workMins, setWorkMins] = useState(25);
  const [breakMins, setBreakMins] = useState(5);
  const [blocks, setBlocks] = useState<PomodoroBlock[]>([]);

  function toggleTask(task: SelectedTask) {
    setSelected(prev =>
      prev.some(s => s.todo.id === task.todo.id)
        ? prev.filter(s => s.todo.id !== task.todo.id)
        : [...prev, task],
    );
  }

  function handleGenerate() {
    setBlocks(generatePlan(selected, workMins, breakMins));
    setStep(2);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pomodoro Planner"
        className={cn(
          'fixed z-50 flex flex-col',
          'inset-x-0 bottom-0 rounded-t-3xl max-h-[92dvh]',
          'md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2',
          'md:rounded-3xl md:w-[480px] md:max-h-[85vh] md:shadow-2xl',
        )}
        style={{ background: 'oklch(0.1 0.008 30)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 md:hidden shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 shrink-0">
          <div className="w-9 h-9 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
            <Timer size={16} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-base text-white truncate">
              {step === 1 ? 'Pomodoro Planner' : 'Edit Plan'}
            </h2>
            <p className="text-xs text-white/30">Step {step} of 2</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-2xl bg-white/8 text-white/50 hover:text-white hover:bg-white/15 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {step === 1 ? (
            <Step1
              workspace={workspace}
              selected={selected}
              workMins={workMins}
              breakMins={breakMins}
              onToggleTask={toggleTask}
              onSetWork={setWorkMins}
              onSetBreak={setBreakMins}
              onGenerate={handleGenerate}
            />
          ) : (
            <Step2
              blocks={blocks}
              onChange={setBlocks}
              onBack={() => setStep(1)}
              onStart={() => onStart(blocks)}
            />
          )}
        </div>
      </div>
    </>
  );
}
