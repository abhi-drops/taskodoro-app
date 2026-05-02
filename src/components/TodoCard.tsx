import { useRef, useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Clock, ChevronRight, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { Todo, TaskPriority } from '@/types/index';

const PRIORITY_BAR: Record<TaskPriority, string> = {
  low:    'bg-white/20',
  medium: 'bg-blue-400',
  high:   'bg-amber-400',
  urgent: 'bg-red-500',
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low:    'text-white/30',
  medium: 'text-blue-400',
  high:   'text-amber-400',
  urgent: 'text-red-400',
};

function EndTimeBadge({ endTime }: { endTime: number }) {
  const diff = endTime - Date.now();
  const isOverdue = diff < 0;
  const abs = Math.abs(diff);
  const hours = Math.floor(abs / 3600000);
  const days = Math.floor(abs / 86400000);

  let label: string;
  if (isOverdue) {
    label = 'Overdue';
  } else if (hours < 1) {
    const mins = Math.floor(abs / 60000);
    label = `${mins}m left`;
  } else if (hours < 24) {
    label = `${hours}h left`;
  } else {
    label = `${days}d left`;
  }

  return (
    <span className={cn(
      'flex items-center gap-0.5 text-[10px] font-semibold rounded-full px-2 py-0.5 shrink-0',
      isOverdue
        ? 'text-red-400 bg-red-400/15'
        : diff < 3600000
          ? 'text-amber-400 bg-amber-400/15'
          : 'text-white/40 bg-white/8',
    )}>
      <Clock size={9} />
      {label}
    </span>
  );
}

interface Props {
  todo: Todo;
  workspaceId: string;
  groupId: string;
  onToggle: () => void;
  onDelete: () => void;
  onOpen?: () => void;
  isDragOverlay?: boolean;
  index?: number;
}

export function TodoCard({ todo, workspaceId, groupId, onToggle, onDelete, onOpen, isDragOverlay = false, index = 0 }: Props) {
  const { state, dispatch } = useAppStore();
  const truncateText = state.settings?.truncateTaskText !== false;
  const isCounter = todo.type === 'counter';
  const isMobile = useIsMobile();

  // Measure rendered text height to decide layout — stacked when text exceeds threshold lines
  const textRef = useRef<HTMLSpanElement>(null);
  const [useStackedLayout, setUseStackedLayout] = useState(false);

  useEffect(() => {
    if (isCounter || truncateText) { setUseStackedLayout(false); return; }
    const el = textRef.current;
    if (!el) return;
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20;
    const threshold = isMobile ? 2 : 1;
    const check = () => {
      setUseStackedLayout(el.scrollHeight > lineHeight * threshold);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [todo.text, truncateText, isCounter, isMobile]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const style = isDragOverlay
    ? {}
    : { transform: CSS.Transform.toString(transform), transition };

  const colorBorderStyle = todo.color
    ? { borderLeftColor: todo.color, borderLeftWidth: '3px' }
    : {};

  function handleIncrement(e: React.MouseEvent) {
    e.stopPropagation();
    const next = (todo.counterValue ?? 0) + 1;
    const capped = todo.counterTarget != null ? Math.min(next, todo.counterTarget) : next;
    dispatch({ type: 'UPDATE_TODO_DETAILS', payload: {
      workspaceId, groupId, todoId: todo.id,
      patch: { counterValue: capped },
    }});
  }

  function handleDecrement(e: React.MouseEvent) {
    e.stopPropagation();
    dispatch({ type: 'UPDATE_TODO_DETAILS', payload: {
      workspaceId, groupId, todoId: todo.id,
      patch: { counterValue: Math.max(0, (todo.counterValue ?? 0) - 1) },
    }});
  }

  if (isCounter) {
    const count = todo.counterValue ?? 0;

    return (
      <div
        ref={isDragOverlay ? undefined : setNodeRef}
        style={{ ...style, ...colorBorderStyle, '--delay': `${index * 40}ms` } as unknown as React.CSSProperties}
        className={cn(
          'm3-list-item m3-hover-lift group rounded-2xl border bg-white/6 border-white/8 transition-colors hover:bg-white/10',
          isDragging && !isDragOverlay && 'opacity-30',
          isDragOverlay && 'shadow-2xl rotate-1 cursor-grabbing border-primary/30 bg-primary/10',
        )}
      >
        {/* ── Row 1: drag · badges · text · actions ── */}
        <div className="flex items-start gap-1.5 px-1.5 pt-2 pb-1">
          {/* Drag handle */}
          <button
            {...(isDragOverlay ? {} : { ...attributes, ...listeners })}
            className="flex items-center justify-center w-7 h-7 cursor-grab touch-none text-white/15 hover:text-white/40 active:cursor-grabbing shrink-0 rounded-lg"
            aria-label="Drag to reorder"
            tabIndex={-1}
          >
            <GripVertical size={15} />
          </button>

          {/* Priority dot */}
          {todo.priority && (
            <span className={cn('w-1.5 h-4 rounded-full shrink-0 mt-1.5', PRIORITY_BAR[todo.priority])} />
          )}

          {/* SN badge */}
          <span className="shrink-0 text-[9px] font-mono font-bold text-white/20 bg-white/6 border border-white/8 rounded px-1 py-0.5 leading-none self-start mt-[7px]">
            #{todo.sn}
          </span>

          {/* Text — owns all remaining space */}
          <button
            onClick={onOpen}
            disabled={!onOpen}
            className="flex-1 min-w-0 text-left mt-[7px] disabled:cursor-default"
          >
            <span className={cn(
              'block text-sm font-medium leading-snug text-white',
              truncateText ? 'truncate' : 'whitespace-normal break-words',
              todo.priority && PRIORITY_LABEL[todo.priority] && 'opacity-90',
            )}>
              {todo.text}
            </span>
          </button>

          {/* Open + delete */}
          {onOpen && (
            <button
              onClick={onOpen}
              className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-white/15 hover:text-white/50 hover:bg-white/8 transition-colors md:opacity-0 md:group-hover:opacity-100"
              aria-label="Open task details"
            >
              <ChevronRight size={13} />
            </button>
          )}
          <button
            onClick={onDelete}
            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-white/15 hover:text-red-400 hover:bg-red-400/10 transition-colors md:opacity-0 md:group-hover:opacity-100"
            aria-label="Delete todo"
          >
            <X size={13} />
          </button>
        </div>

        {/* ── Row 2: counter pill — always full-width bottom row ── */}
        <div className="px-2 pb-2">
          <div className="flex items-center rounded-xl overflow-hidden border border-white/8 bg-white/4">
            {/* Decrement */}
            <button
              onClick={handleDecrement}
              aria-label="Decrement counter"
              className="btn-spring-icon flex items-center justify-center w-11 h-10 text-white/35 hover:text-white hover:bg-white/8 transition-colors shrink-0"
            >
              <Minus size={15} strokeWidth={2.5} />
            </button>

            {/* Divider */}
            <div className="w-px h-5 bg-white/10 shrink-0" />

            {/* Value — grows to fill remaining space */}
            <div className="flex-1 flex items-center justify-center gap-1 py-2.5">
              <span className="font-mono font-black text-xl text-white tabular-nums leading-none tracking-tighter">
                {count}
              </span>
              {todo.counterTarget != null && (
                <span className="font-mono font-bold text-sm text-white/35 tabular-nums leading-none">
                  /{todo.counterTarget}
                </span>
              )}
            </div>

            {/* Divider */}
            <div className="w-px h-5 bg-white/10 shrink-0" />

            {/* Increment — primary tonal */}
            <button
              onClick={handleIncrement}
              aria-label="Increment counter"
              className="btn-spring-icon flex items-center justify-center w-11 h-10 bg-primary/18 text-primary hover:bg-primary/28 transition-colors shrink-0"
            >
              <Plus size={15} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={{ ...style, ...colorBorderStyle, '--delay': `${index * 40}ms` } as unknown as React.CSSProperties}
      className={cn(
        'm3-list-item m3-hover-lift group rounded-2xl border bg-white/6 border-white/8 transition-colors hover:bg-white/10',
        isDragging && !isDragOverlay && 'opacity-30',
        isDragOverlay && 'shadow-2xl rotate-1 cursor-grabbing border-primary/30 bg-primary/10',
        useStackedLayout ? 'flex items-stretch gap-1.5 px-1.5 py-2' : 'flex items-start gap-2 px-2 py-3',
      )}
    >
      {useStackedLayout ? (
        <>
          {/* STACKED LAYOUT — left strip vertical, text uses full width */}
          <div className="flex flex-col items-center gap-1.5 shrink-0 pt-1.5">
            <button
              {...(isDragOverlay ? {} : { ...attributes, ...listeners })}
              className="flex items-center justify-center w-7 h-7 cursor-grab touch-none text-white/15 hover:text-white/40 active:cursor-grabbing rounded-lg"
              aria-label="Drag to reorder"
              tabIndex={-1}
            >
              <GripVertical size={15} />
            </button>
            <span className="text-[9px] font-mono font-bold text-white/20 bg-white/6 border border-white/8 rounded px-1 py-0.5 leading-none">
              #{todo.sn}
            </span>
            {todo.priority && (
              <span className={cn('w-1.5 h-4 rounded-full', PRIORITY_BAR[todo.priority])} />
            )}
            <button
              onClick={onToggle}
              className={cn(
                'spring-check w-5 h-5 border-2 flex items-center justify-center shrink-0',
                todo.completed ? 'border-primary bg-primary rounded-full' : 'border-white/20 hover:border-white/50 rounded-md',
              )}
              aria-label={`Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'complete'}`}
            >
              {todo.completed && (
                <svg viewBox="0 0 10 8" className="w-3 h-3 text-white fill-current">
                  <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="m3-check-draw" />
                </svg>
              )}
            </button>
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex items-start gap-1">
              <button onClick={onOpen} disabled={!onOpen} className="flex-1 min-w-0 text-left py-1 disabled:cursor-default">
                <span ref={textRef} className={cn(
                  'block text-sm leading-snug font-medium',
                  todo.completed ? 'line-through text-white/25' : 'text-white',
                  todo.priority && PRIORITY_LABEL[todo.priority] && !todo.completed && 'opacity-90',
                )}>
                  {todo.text}
                </span>
                {todo.endTime && <span className="mt-1 inline-flex"><EndTimeBadge endTime={todo.endTime} /></span>}
              </button>
              <div className="flex items-center shrink-0">
                {onOpen && (
                  <button onClick={onOpen} className="flex items-center justify-center w-7 h-7 rounded-lg text-white/15 hover:text-white/60 hover:bg-white/8 transition-colors md:opacity-0 md:group-hover:opacity-100" aria-label="Open task details">
                    <ChevronRight size={13} />
                  </button>
                )}
                <button onClick={onDelete} className="flex items-center justify-center w-7 h-7 rounded-lg text-white/15 hover:text-red-400 hover:bg-red-400/10 transition-colors md:opacity-0 md:group-hover:opacity-100" aria-label="Delete todo">
                  <X size={13} />
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* INLINE LAYOUT — single row for short text */}
          <button
            {...(isDragOverlay ? {} : { ...attributes, ...listeners })}
            className="flex items-center justify-center w-8 h-8 cursor-grab touch-none text-white/15 hover:text-white/40 active:cursor-grabbing shrink-0 rounded-xl"
            aria-label="Drag to reorder"
            tabIndex={-1}
          >
            <GripVertical size={16} />
          </button>

          {todo.priority && (
            <span className={cn('w-1.5 h-5 rounded-full shrink-0 mt-1.5', PRIORITY_BAR[todo.priority])} />
          )}

          <span className="shrink-0 mt-1.5 text-[10px] font-mono font-bold text-white/20 bg-white/6 border border-white/8 rounded-md px-1.5 py-0.5">
            #{todo.sn}
          </span>

          <button
            onClick={onToggle}
            className={cn(
              'spring-check shrink-0 mt-1.5 w-5 h-5 border-2 flex items-center justify-center',
              todo.completed ? 'border-primary bg-primary rounded-full' : 'border-white/20 hover:border-white/50 rounded-md',
            )}
            aria-label={`Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'complete'}`}
          >
            {todo.completed && (
              <svg viewBox="0 0 10 8" className="w-3 h-3 text-white fill-current">
                <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="m3-check-draw" />
              </svg>
            )}
          </button>

          <button onClick={onOpen} disabled={!onOpen} className="flex-1 flex items-start gap-1.5 min-w-0 text-left mt-1.5 disabled:cursor-default">
            <span ref={textRef} className={cn(
              'flex-1 text-sm leading-snug font-medium',
              truncateText && 'truncate',
              todo.completed ? 'line-through text-white/25' : 'text-white',
              todo.priority && PRIORITY_LABEL[todo.priority] && !todo.completed && 'opacity-90',
            )}>
              {todo.text}
            </span>
            {todo.endTime && <EndTimeBadge endTime={todo.endTime} />}
          </button>

          {onOpen && (
            <button onClick={onOpen} className="shrink-0 flex items-center justify-center w-8 h-8 rounded-xl text-white/15 hover:text-white/60 hover:bg-white/8 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100" aria-label="Open task details">
              <ChevronRight size={14} />
            </button>
          )}

          <button onClick={onDelete} className="shrink-0 flex items-center justify-center w-8 h-8 rounded-xl text-white/15 hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100" aria-label="Delete todo">
            <X size={14} />
          </button>
        </>
      )}
    </div>
  );
}
