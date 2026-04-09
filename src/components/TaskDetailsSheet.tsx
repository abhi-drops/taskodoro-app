import { useState, useRef, useEffect } from 'react';
import { X, Clock, Tag, MessageSquare, AlignLeft, Flag, Palette, ArrowRightLeft, Trash2, Send, CheckCircle2, Circle, Plus, ListTodo, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCountdown } from '@/hooks/useCountdown';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import type { Todo, Group, TaskPriority } from '@/types/index';
import type { AppAction } from '@/store/useAppStore';

type Dispatch = React.Dispatch<AppAction>;

interface Props {
  todo: Todo;
  currentGroupId: string;
  workspaceId: string;
  allGroups: Group[];
  isMobile: boolean;
  onClose: () => void;
  onMove: (newGroupId: string) => void;
  dispatch: Dispatch;
}

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; active: string; dot: string }> = {
  low:    { label: 'Low',    active: 'bg-white/10 text-white/50 ring-1 ring-white/20',         dot: 'bg-white/20' },
  medium: { label: 'Medium', active: 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-400/30',   dot: 'bg-blue-400' },
  high:   { label: 'High',   active: 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-400/30',dot: 'bg-amber-400' },
  urgent: { label: 'Urgent', active: 'bg-primary/20 text-primary ring-1 ring-primary/40',      dot: 'bg-primary' },
};

const PRESET_COLORS = [
  { hex: '#ef4444', label: 'Red' },
  { hex: '#f97316', label: 'Orange' },
  { hex: '#eab308', label: 'Yellow' },
  { hex: '#22c55e', label: 'Green' },
  { hex: '#3b82f6', label: 'Blue' },
  { hex: '#8b5cf6', label: 'Violet' },
  { hex: '#ec4899', label: 'Pink' },
  { hex: '#6b7280', label: 'Gray' },
];

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function CountdownDisplay({ endTime }: { endTime?: number }) {
  const cd = useCountdown(endTime);
  if (!cd) return null;
  const parts = [];
  if (cd.days > 0) parts.push(`${cd.days}d`);
  if (cd.hours > 0) parts.push(`${cd.hours}h`);
  if (cd.minutes > 0) parts.push(`${cd.minutes}m`);
  parts.push(`${cd.seconds}s`);
  const timeStr = parts.join(' ');
  return (
    <div className={cn(
      'flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold',
      cd.isOverdue
        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
        : cd.isExpiringSoon
          ? 'bg-amber-500/20 text-amber-400 border border-amber-400/30'
          : 'bg-white/8 text-white/60 border border-white/10',
    )}>
      <Clock size={14} className="shrink-0" />
      {cd.isOverdue ? `Overdue by ${timeStr}` : `${timeStr} remaining`}
    </div>
  );
}

export function TaskDetailsSheet({
  todo, currentGroupId, workspaceId, allGroups, isMobile, onClose, onMove, dispatch,
}: Props) {
  const [tagInput, setTagInput] = useState('');
  const [commentText, setCommentText] = useState('');
  const [subtaskInput, setSubtaskInput] = useState('');
  const [showMarkdownEditor, setShowMarkdownEditor] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto';
      titleRef.current.style.height = `${titleRef.current.scrollHeight}px`;
    }
  }, [todo.text]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  function patch(p: Partial<Pick<Todo, 'description' | 'priority' | 'color' | 'tags' | 'endTime' | 'text' | 'subtasks'>>) {
    dispatch({ type: 'UPDATE_TODO_DETAILS', payload: { workspaceId, groupId: currentGroupId, todoId: todo.id, patch: p } });
  }

  function handleToggleComplete() {
    dispatch({ type: 'TOGGLE_TODO', payload: { workspaceId, groupId: currentGroupId, todoId: todo.id } });
  }

  function addTag(raw: string) {
    const val = raw.trim().replace(/,+$/, '').trim();
    if (!val) return;
    const existing = todo.tags ?? [];
    if (existing.includes(val)) return;
    patch({ tags: [...existing, val] });
    setTagInput('');
  }

  function removeTag(tag: string) {
    patch({ tags: (todo.tags ?? []).filter(t => t !== tag) });
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); }
  }

  function handleEndTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    patch({ endTime: val ? new Date(val).getTime() : undefined });
  }

  function handleMoveTo(e: React.ChangeEvent<HTMLSelectElement>) {
    const toGroupId = e.target.value;
    if (!toGroupId || toGroupId === currentGroupId) return;
    dispatch({ type: 'MOVE_TODO', payload: { workspaceId, todoId: todo.id, fromGroupId: currentGroupId, toGroupId } });
    onMove(toGroupId);
  }

  function submitComment() {
    const text = commentText.trim();
    if (!text) return;
    dispatch({ type: 'ADD_COMMENT', payload: { workspaceId, groupId: currentGroupId, todoId: todo.id, text } });
    setCommentText('');
  }

  function addSubtask() {
    const text = subtaskInput.trim();
    if (!text) return;
    dispatch({ type: 'ADD_SUBTASK', payload: { workspaceId, groupId: currentGroupId, todoId: todo.id, text } });
    setSubtaskInput('');
  }

  const endTimeValue = todo.endTime
    ? new Date(todo.endTime - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    : '';

  const otherGroups = allGroups.filter(g => g.id !== currentGroupId);
  const subtasks = todo.subtasks ?? [];
  const doneCount = subtasks.filter(s => s.completed).length;

  const sheetContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-details-title"
      className={cn(
        'flex flex-col z-50',
        isMobile
          ? 'fixed inset-x-0 bottom-0 rounded-t-3xl shadow-2xl max-h-[90dvh] border-t border-white/10'
          : 'fixed inset-y-0 right-0 w-[420px] border-l border-white/10 shadow-2xl',
      )}
      style={{
        background: 'oklch(0.1 0.008 30)',
        ...(isMobile ? { paddingBottom: 'env(safe-area-inset-bottom)' } : { paddingTop: 'env(safe-area-inset-top)' }),
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Drag handle */}
      {isMobile && (
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-2 px-4 py-3 border-b border-white/8 shrink-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="shrink-0 text-[10px] font-mono font-bold text-white/25 bg-white/6 border border-white/10 rounded-md px-1.5 py-0.5">
              #{todo.sn}
            </span>
            {todo.priority && (
              <span className={cn('text-xs font-semibold px-2.5 py-0.5 rounded-full', PRIORITY_CONFIG[todo.priority].active)}>
                {PRIORITY_CONFIG[todo.priority].label}
              </span>
            )}
          </div>
          <textarea
            ref={titleRef}
            id="task-details-title"
            value={todo.text}
            onChange={e => patch({ text: e.target.value })}
            rows={1}
            className="w-full font-bold text-base bg-transparent resize-none focus:outline-none leading-snug text-white placeholder:text-white/30"
            placeholder="Task title…"
          />
        </div>
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          <button
            onClick={handleToggleComplete}
            className={cn(
              'flex items-center gap-1.5 h-9 px-3 rounded-2xl text-sm font-semibold transition-all active:scale-95',
              todo.completed
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'bg-white/8 text-white/50 hover:bg-white/15 border border-white/10',
            )}
            aria-label={todo.completed ? 'Mark incomplete' : 'Mark complete'}
          >
            {todo.completed ? <CheckCircle2 size={16} className="shrink-0" /> : <Circle size={16} className="shrink-0" />}
            <span className="hidden sm:inline">{todo.completed ? 'Done' : 'Mark done'}</span>
          </button>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-2xl text-white/40 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={17} />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-4 py-4 space-y-5">

          {/* Priority */}
          <Section icon={<Flag size={13} />} label="Priority">
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map(p => (
                <button
                  key={p}
                  onClick={() => patch({ priority: todo.priority === p ? undefined : p })}
                  className={cn(
                    'px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all active:scale-95',
                    todo.priority === p
                      ? PRIORITY_CONFIG[p].active
                      : 'bg-white/8 text-white/40 hover:bg-white/15 hover:text-white border border-white/8',
                  )}
                >
                  {PRIORITY_CONFIG[p].label}
                </button>
              ))}
            </div>
          </Section>

          {/* Subtasks */}
          <Section icon={<ListTodo size={13} />} label={`Subtasks${subtasks.length > 0 ? ` (${doneCount}/${subtasks.length})` : ''}`}>
            <div className="space-y-1.5">
              {subtasks.map(sub => (
                <div key={sub.id} className="flex items-center gap-2 group/sub px-3 py-2 rounded-2xl bg-white/5 border border-white/6 hover:bg-white/8 transition-colors">
                  <button
                    onClick={() => dispatch({ type: 'TOGGLE_SUBTASK', payload: { workspaceId, groupId: currentGroupId, todoId: todo.id, subtaskId: sub.id } })}
                    className="shrink-0"
                    aria-label={sub.completed ? 'Uncheck subtask' : 'Check subtask'}
                  >
                    {sub.completed
                      ? <CheckCircle2 size={17} className="text-primary" />
                      : <Circle size={17} className="text-white/25" />
                    }
                  </button>
                  <span className={cn('flex-1 text-sm text-white', sub.completed && 'line-through text-white/25')}>
                    {sub.text}
                  </span>
                  <button
                    onClick={() => dispatch({ type: 'DELETE_SUBTASK', payload: { workspaceId, groupId: currentGroupId, todoId: todo.id, subtaskId: sub.id } })}
                    className="opacity-0 group-hover/sub:opacity-100 flex items-center justify-center w-7 h-7 rounded-xl text-white/20 hover:text-red-400 transition-all"
                    aria-label="Delete subtask"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={subtaskInput}
                  onChange={e => setSubtaskInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(); } }}
                  placeholder="Add subtask…"
                  className="flex-1 h-11 rounded-2xl border border-white/10 bg-white/6 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-white/25"
                />
                <button
                  onClick={addSubtask}
                  disabled={!subtaskInput.trim()}
                  className="flex items-center justify-center w-11 h-11 rounded-2xl bg-primary text-white disabled:opacity-30 disabled:cursor-not-allowed transition-opacity active:scale-95 shrink-0"
                  aria-label="Add subtask"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </Section>

          {/* Description */}
          <Section icon={<AlignLeft size={13} />} label="Description">
            <button
              onClick={() => setShowMarkdownEditor(true)}
              className={cn(
                'w-full text-left rounded-2xl border transition-colors px-4 py-3 group',
                todo.description
                  ? 'border-white/10 hover:border-primary/30 bg-white/5 hover:bg-white/8'
                  : 'border-dashed border-white/10 hover:border-primary/30 hover:bg-white/5',
              )}
            >
              {todo.description ? (
                <div className="flex items-start gap-2">
                  <DescriptionPreview text={todo.description} />
                  <Pencil size={12} className="shrink-0 mt-0.5 text-white/20 group-hover:text-white/50 transition-colors" />
                </div>
              ) : (
                <span className="flex items-center gap-2 text-sm text-white/30">
                  <Pencil size={13} />
                  Add description…
                </span>
              )}
            </button>
          </Section>

          {/* Due Date */}
          <Section icon={<Clock size={13} />} label="Due Date & Time">
            <div className="space-y-2">
              <div className="flex gap-2 items-center">
                <input
                  type="datetime-local"
                  value={endTimeValue}
                  onChange={handleEndTimeChange}
                  className="flex-1 h-11 rounded-2xl border border-white/10 bg-white/6 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                  style={{ colorScheme: 'dark' }}
                />
                {todo.endTime && (
                  <button
                    onClick={() => patch({ endTime: undefined })}
                    className="flex items-center justify-center w-11 h-11 rounded-2xl border border-white/10 bg-white/6 text-white/40 hover:text-primary hover:border-primary/30 transition-colors"
                    aria-label="Clear due date"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <CountdownDisplay endTime={todo.endTime} />
            </div>
          </Section>

          {/* Color */}
          <Section icon={<Palette size={13} />} label="Color">
            <div className="flex gap-2 flex-wrap items-center">
              <button
                onClick={() => patch({ color: undefined })}
                className={cn(
                  'w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center text-xs font-bold text-white/30',
                  !todo.color ? 'border-primary scale-110' : 'border-white/15 hover:border-white/40',
                )}
                aria-label="No color"
              >
                ✕
              </button>
              {PRESET_COLORS.map(c => (
                <button
                  key={c.hex}
                  onClick={() => patch({ color: c.hex })}
                  style={{ backgroundColor: c.hex }}
                  className={cn(
                    'w-9 h-9 rounded-full border-2 transition-all',
                    todo.color === c.hex ? 'border-white scale-110 shadow-md' : 'border-transparent hover:scale-105',
                  )}
                  aria-label={c.label}
                />
              ))}
            </div>
          </Section>

          {/* Tags */}
          <Section icon={<Tag size={13} />} label="Tags">
            <div className="space-y-2">
              {(todo.tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {(todo.tags ?? []).map(tag => (
                    <span key={tag} className="flex items-center gap-1 bg-primary/10 border border-primary/25 rounded-full px-2.5 py-1 text-xs font-semibold text-primary">
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="text-primary/60 hover:text-primary transition-colors"
                        aria-label={`Remove tag ${tag}`}
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => addTag(tagInput)}
                placeholder="Add tag, press Enter…"
                className="w-full h-11 rounded-2xl border border-white/10 bg-white/6 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-white/25"
              />
            </div>
          </Section>

          {/* Move to group */}
          {otherGroups.length > 0 && (
            <Section icon={<ArrowRightLeft size={13} />} label="Move to Group">
              <select
                value=""
                onChange={handleMoveTo}
                className="w-full h-11 rounded-2xl border border-white/10 bg-white/6 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                style={{ colorScheme: 'dark' }}
              >
                <option value="" disabled>Select a group…</option>
                {otherGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </Section>
          )}

          {/* Comments */}
          <Section icon={<MessageSquare size={13} />} label={`Comments (${(todo.comments ?? []).length})`}>
            <div className="space-y-3">
              {(todo.comments ?? []).length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(todo.comments ?? []).map(comment => (
                    <div key={comment.id} className="group/comment bg-white/5 border border-white/8 rounded-2xl px-3 py-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-white/30">{formatRelativeTime(comment.createdAt)}</span>
                        <button
                          onClick={() => dispatch({ type: 'DELETE_COMMENT', payload: { workspaceId, groupId: currentGroupId, todoId: todo.id, commentId: comment.id } })}
                          className="opacity-0 group-hover/comment:opacity-100 flex items-center justify-center w-6 h-6 rounded-xl text-white/20 hover:text-red-400 transition-all"
                          aria-label="Delete comment"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <p className="text-sm text-white/70 leading-relaxed">{comment.text}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 items-end">
                <textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                  placeholder="Write a comment…"
                  rows={2}
                  className="flex-1 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-white/25"
                />
                <button
                  onClick={submitComment}
                  disabled={!commentText.trim()}
                  className="flex items-center justify-center w-11 h-11 rounded-2xl bg-primary text-white disabled:opacity-30 disabled:cursor-not-allowed transition-opacity active:scale-95 shrink-0"
                  aria-label="Post comment"
                >
                  <Send size={15} />
                </button>
              </div>
            </div>
          </Section>

        </div>
      </div>
    </div>
  );

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
        aria-hidden="true"
      />
      {sheetContent}

      {showMarkdownEditor && (
        <MarkdownEditor
          initialValue={todo.description ?? ''}
          onSave={value => patch({ description: value })}
          onClose={() => setShowMarkdownEditor(false)}
        />
      )}
    </>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-bold text-white/30 uppercase tracking-widest">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}

// ─── Description preview ──────────────────────────────────────────────────────

function DescriptionPreview({ text }: { text: string }) {
  const lines = text.split('\n').filter(l => l.trim()).slice(0, 3);
  return (
    <div className="flex-1 space-y-1 min-w-0">
      {lines.map((line, i) => {
        if (line.startsWith('# ')) return <p key={i} className="text-sm font-bold truncate text-white">{line.slice(2)}</p>;
        if (line.startsWith('## ')) return <p key={i} className="text-sm font-semibold truncate text-white">{line.slice(3)}</p>;
        if (line.startsWith('- ')) return (
          <p key={i} className="text-sm text-white/60 truncate flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-white/30 shrink-0" />
            {line.slice(2)}
          </p>
        );
        const plain = line.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
        return <p key={i} className="text-sm text-white/60 truncate">{plain}</p>;
      })}
      {text.split('\n').filter(l => l.trim()).length > 3 && (
        <p className="text-xs text-white/25">…more</p>
      )}
    </div>
  );
}
