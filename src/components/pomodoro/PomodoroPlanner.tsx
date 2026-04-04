import { useState, useMemo, useRef } from 'react';
import { X, Search, ChevronUp, ChevronDown, Trash2, Plus, ArrowLeft, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

function generatePlan(
  tasks: SelectedTask[],
  workMins: number,
  breakMins: number,
): PomodoroBlock[] {
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

// ─── Step 1: Task Selector ────────────────────────────────────────────────────

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

function Step1({
  workspace,
  selected,
  workMins,
  breakMins,
  onToggleTask,
  onSetWork,
  onSetBreak,
  onGenerate,
}: Step1Props) {
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
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search tasks…"
          className="pl-9 h-10"
          autoFocus
        />
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto min-h-0 -mx-4 px-4">
        {grouped.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No tasks found</p>
        ) : (
          <div className="flex flex-col gap-3">
            {grouped.map(({ groupName, tasks }) => (
              <div key={groupName}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
                  {groupName}
                </p>
                <div className="flex flex-col gap-1">
                  {tasks.map(t => {
                    const active = isSelected(t.todo.id);
                    return (
                      <button
                        key={t.todo.id}
                        onClick={() => onToggleTask(t)}
                        className={cn(
                          'flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-xl transition-colors text-sm',
                          active
                            ? 'bg-primary/10 text-foreground'
                            : 'hover:bg-muted text-foreground',
                        )}
                      >
                        <span
                          className={cn(
                            'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors',
                            active ? 'border-primary bg-primary' : 'border-border',
                          )}
                        >
                          {active && (
                            <svg viewBox="0 0 10 8" className="w-3 h-3 text-primary-foreground fill-current">
                              <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        <span className={cn('flex-1 truncate', t.todo.completed && 'line-through text-muted-foreground')}>
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
            <span
              key={s.todo.id}
              className="flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full max-w-[180px]"
            >
              <span className="truncate">{s.todo.text}</span>
              <button onClick={() => onToggleTask(s)} className="shrink-0 hover:text-destructive">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Duration selectors */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div>
          <p className="text-xs text-muted-foreground mb-1.5 font-medium">Work (mins)</p>
          <div className="flex flex-wrap gap-1.5">
            {WORK_OPTIONS.map(m => (
              <button
                key={m}
                onClick={() => onSetWork(m)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-sm font-medium transition-colors',
                  workMins === m ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground',
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1.5 font-medium">Break (mins)</p>
          <div className="flex flex-wrap gap-1.5">
            {BREAK_OPTIONS.map(m => (
              <button
                key={m}
                onClick={() => onSetBreak(m)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-sm font-medium transition-colors',
                  breakMins === m ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground hover:text-foreground',
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Button
        onClick={onGenerate}
        disabled={selected.length === 0}
        className="w-full h-11 text-sm font-semibold gap-2"
      >
        <Timer size={16} />
        Generate Plan ({selected.length} task{selected.length !== 1 ? 's' : ''})
      </Button>
    </div>
  );
}

// ─── Step 2: Plan Editor ──────────────────────────────────────────────────────

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
    onChange([
      ...blocks,
      {
        id: crypto.randomUUID(),
        type: 'work',
        label: 'New task',
        durationMins: 25,
        completed: false,
      },
    ]);
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3 p-4">
      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{blocks.length} blocks</span>
        <span>{totalMins} min total</span>
      </div>

      {/* Block list */}
      <div className="flex-1 overflow-y-auto min-h-0 -mx-4 px-4 flex flex-col gap-2">
        {blocks.map((block, idx) => (
          <div
            key={block.id}
            className={cn(
              'flex items-center gap-2 p-2.5 rounded-xl border',
              block.type === 'work' ? 'border-primary/20 bg-primary/5' : 'border-emerald-500/20 bg-emerald-500/5',
            )}
          >
            {/* Up/Down */}
            <div className="flex flex-col gap-0.5 shrink-0">
              <button
                onClick={() => moveUp(idx)}
                disabled={idx === 0}
                className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ChevronUp size={14} />
              </button>
              <button
                onClick={() => moveDown(idx)}
                disabled={idx === blocks.length - 1}
                className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ChevronDown size={14} />
              </button>
            </div>

            {/* Type toggle */}
            <button
              onClick={() => update(block.id, { type: block.type === 'work' ? 'break' : 'work' })}
              className={cn(
                'shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full transition-colors',
                block.type === 'work'
                  ? 'bg-primary/15 text-primary'
                  : 'bg-emerald-500/15 text-emerald-600',
              )}
            >
              {block.type === 'work' ? 'Work' : 'Break'}
            </button>

            {/* Label */}
            <input
              value={block.label}
              onChange={e => update(block.id, { label: e.target.value })}
              className="flex-1 min-w-0 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
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
                className="w-9 bg-transparent text-sm text-center outline-none text-foreground"
              />
              <span className="text-xs text-muted-foreground">m</span>
            </div>

            {/* Delete */}
            <button
              onClick={() => remove(block.id)}
              className="shrink-0 text-muted-foreground/50 hover:text-destructive transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        {/* Add block */}
        <button
          onClick={addBlock}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          <Plus size={14} />
          Add block
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button variant="outline" onClick={onBack} className="gap-1.5">
          <ArrowLeft size={15} />
          Back
        </Button>
        <Button
          onClick={onStart}
          disabled={blocks.length === 0}
          className="flex-1 gap-2 font-semibold"
        >
          <Timer size={16} />
          Save & Start
        </Button>
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
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pomodoro Planner"
        className={cn(
          'fixed z-50 bg-background flex flex-col',
          // Mobile: bottom sheet
          'inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]',
          // Desktop: centered modal
          'md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2',
          'md:rounded-2xl md:w-[480px] md:max-h-[85vh] md:shadow-2xl',
          'animate-slide-up',
        )}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden shrink-0">
          <div className="w-9 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Timer size={18} className="text-primary shrink-0" />
            <h2 className="font-semibold text-base truncate">
              {step === 1 ? 'Pomodoro Planner' : 'Edit Plan'}
            </h2>
          </div>
          {step === 2 && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              Step 2 of 2
            </span>
          )}
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
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
