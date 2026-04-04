import { useState, useRef, useEffect } from 'react';
import { X, Clock, Tag, MessageSquare, AlignLeft, Flag, Palette, ArrowRightLeft, Trash2, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCountdown } from '@/hooks/useCountdown';
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

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; dot: string }> = {
  low:    { label: 'Low',    color: 'bg-muted text-muted-foreground',                  dot: 'bg-muted-foreground/40' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',    dot: 'bg-blue-500' },
  high:   { label: 'High',   color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', dot: 'bg-amber-500' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',       dot: 'bg-red-500' },
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
      'flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium',
      cd.isOverdue
        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        : cd.isExpiringSoon
          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    )}>
      <Clock size={14} className="shrink-0" />
      {cd.isOverdue ? `Overdue by ${timeStr}` : `${timeStr} remaining`}
    </div>
  );
}

export function TaskDetailsSheet({
  todo,
  currentGroupId,
  workspaceId,
  allGroups,
  isMobile,
  onClose,
  onMove,
  dispatch,
}: Props) {
  const [tagInput, setTagInput] = useState('');
  const [commentText, setCommentText] = useState('');
  const descRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textareas
  useEffect(() => {
    if (descRef.current) {
      descRef.current.style.height = 'auto';
      descRef.current.style.height = `${descRef.current.scrollHeight}px`;
    }
  }, [todo.description]);

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto';
      titleRef.current.style.height = `${titleRef.current.scrollHeight}px`;
    }
  }, [todo.text]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  function patch(p: Partial<Pick<Todo, 'description' | 'priority' | 'color' | 'tags' | 'endTime' | 'text'>>) {
    dispatch({ type: 'UPDATE_TODO_DETAILS', payload: { workspaceId, groupId: currentGroupId, todoId: todo.id, patch: p } });
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
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    }
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

  const endTimeValue = todo.endTime
    ? new Date(todo.endTime - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    : '';

  const otherGroups = allGroups.filter(g => g.id !== currentGroupId);

  const sheetContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-details-title"
      className={cn(
        'bg-card flex flex-col z-50',
        isMobile
          ? 'fixed inset-x-0 bottom-0 rounded-t-2xl shadow-xl max-h-[90dvh] border-t border-border'
          : 'fixed inset-y-0 right-0 w-[420px] border-l border-border shadow-2xl',
      )}
      style={isMobile ? { paddingBottom: 'env(safe-area-inset-bottom)' } : { paddingTop: 'env(safe-area-inset-top)' }}
      onClick={e => e.stopPropagation()}
    >
      {/* Drag handle (mobile only) */}
      {isMobile && (
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-2 px-4 py-3 border-b border-border shrink-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="shrink-0 text-xs font-mono px-1.5 py-0 h-5 text-muted-foreground">
              #{todo.sn}
            </Badge>
            {todo.priority && (
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', PRIORITY_CONFIG[todo.priority].color)}>
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
            className="w-full font-semibold text-base bg-transparent resize-none focus:outline-none leading-snug"
            placeholder="Task title…"
          />
        </div>
        <button
          onClick={onClose}
          className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:bg-muted transition-colors mt-0.5"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-4 py-4 space-y-5">

          {/* Priority */}
          <Section icon={<Flag size={14} />} label="Priority">
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map(p => (
                <button
                  key={p}
                  onClick={() => patch({ priority: todo.priority === p ? undefined : p })}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                    todo.priority === p
                      ? PRIORITY_CONFIG[p].color + ' ring-2 ring-offset-1 ring-current/30'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80',
                  )}
                >
                  {PRIORITY_CONFIG[p].label}
                </button>
              ))}
            </div>
          </Section>

          {/* Description */}
          <Section icon={<AlignLeft size={14} />} label="Description">
            <textarea
              ref={descRef}
              value={todo.description ?? ''}
              onChange={e => patch({ description: e.target.value })}
              placeholder="Add a description…"
              rows={3}
              className="w-full text-sm bg-muted/40 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/60 min-h-[80px]"
            />
          </Section>

          {/* End Time + Countdown */}
          <Section icon={<Clock size={14} />} label="Due Date & Time">
            <div className="space-y-2">
              <div className="flex gap-2 items-center">
                <input
                  type="datetime-local"
                  value={endTimeValue}
                  onChange={handleEndTimeChange}
                  className="flex-1 h-11 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                {todo.endTime && (
                  <button
                    onClick={() => patch({ endTime: undefined })}
                    className="flex items-center justify-center w-11 h-11 rounded-xl border border-border text-muted-foreground hover:text-destructive hover:border-destructive transition-colors"
                    aria-label="Clear due date"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
              <CountdownDisplay endTime={todo.endTime} />
            </div>
          </Section>

          {/* Color */}
          <Section icon={<Palette size={14} />} label="Color">
            <div className="flex gap-2 flex-wrap items-center">
              {/* None option */}
              <button
                onClick={() => patch({ color: undefined })}
                className={cn(
                  'w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center text-xs font-bold text-muted-foreground',
                  !todo.color ? 'border-primary scale-110' : 'border-border hover:border-muted-foreground',
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
                    todo.color === c.hex ? 'border-foreground scale-110 shadow-md' : 'border-transparent hover:scale-105',
                  )}
                  aria-label={c.label}
                />
              ))}
            </div>
          </Section>

          {/* Tags */}
          <Section icon={<Tag size={14} />} label="Tags">
            <div className="space-y-2">
              {(todo.tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {(todo.tags ?? []).map(tag => (
                    <span key={tag} className="flex items-center gap-1 bg-muted rounded-full px-2.5 py-1 text-xs font-medium">
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
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
                className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground/60"
              />
            </div>
          </Section>

          {/* Move to group */}
          {otherGroups.length > 0 && (
            <Section icon={<ArrowRightLeft size={14} />} label="Move to Group">
              <select
                value=""
                onChange={handleMoveTo}
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="" disabled>Select a group…</option>
                {otherGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </Section>
          )}

          {/* Comments */}
          <Section icon={<MessageSquare size={14} />} label={`Comments (${(todo.comments ?? []).length})`}>
            <div className="space-y-3">
              {(todo.comments ?? []).length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(todo.comments ?? []).map(comment => (
                    <div key={comment.id} className="group/comment bg-muted/40 rounded-xl px-3 py-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">{formatRelativeTime(comment.createdAt)}</span>
                        <button
                          onClick={() => dispatch({ type: 'DELETE_COMMENT', payload: { workspaceId, groupId: currentGroupId, todoId: todo.id, commentId: comment.id } })}
                          className="opacity-0 group-hover/comment:opacity-100 flex items-center justify-center w-6 h-6 rounded text-muted-foreground/50 hover:text-destructive transition-all"
                          aria-label="Delete comment"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <p className="text-sm leading-relaxed">{comment.text}</p>
                    </div>
                  ))}
                </div>
              )}
              {/* Add comment */}
              <div className="flex gap-2 items-end">
                <textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); }
                  }}
                  placeholder="Write a comment…"
                  rows={2}
                  className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground/60"
                />
                <button
                  onClick={submitComment}
                  disabled={!commentText.trim()}
                  className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shrink-0"
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
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {sheetContent}
    </>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}
