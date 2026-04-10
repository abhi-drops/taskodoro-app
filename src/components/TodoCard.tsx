import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Clock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  onToggle: () => void;
  onDelete: () => void;
  onOpen?: () => void;
  isDragOverlay?: boolean;
  index?: number;
}

export function TodoCard({ todo, onToggle, onDelete, onOpen, isDragOverlay = false, index = 0 }: Props) {
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

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={{ ...style, ...colorBorderStyle, '--delay': `${index * 40}ms` } as React.CSSProperties}
      className={cn(
        'm3-list-item m3-hover-lift group flex items-center gap-2 rounded-2xl border bg-white/6 border-white/8 px-2 py-3',
        isDragging && !isDragOverlay && 'opacity-30',
        isDragOverlay && 'shadow-2xl rotate-1 cursor-grabbing border-primary/30 bg-primary/10',
        'transition-colors hover:bg-white/10',
      )}
    >
      {/* Drag handle */}
      <button
        {...(isDragOverlay ? {} : { ...attributes, ...listeners })}
        className="flex items-center justify-center w-8 h-8 cursor-grab touch-none text-white/15 hover:text-white/40 active:cursor-grabbing shrink-0 rounded-xl"
        aria-label="Drag to reorder"
        tabIndex={-1}
      >
        <GripVertical size={16} />
      </button>

      {/* Priority dot */}
      {todo.priority && (
        <span className={cn('w-1.5 h-5 rounded-full shrink-0', PRIORITY_BAR[todo.priority])} />
      )}

      {/* SN badge */}
      <span className="shrink-0 text-[10px] font-mono font-bold text-white/20 bg-white/6 border border-white/8 rounded-md px-1.5 py-0.5">
        #{todo.sn}
      </span>

      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={cn(
          'spring-check shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center',
          todo.completed
            ? 'border-primary bg-primary'
            : 'border-white/20 hover:border-white/50',
        )}
        aria-label={`Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'complete'}`}
      >
        {todo.completed && (
          <svg viewBox="0 0 10 8" className="w-3 h-3 text-white fill-current">
            <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="m3-check-draw" />
          </svg>
        )}
      </button>

      {/* Text + badges */}
      <button
        onClick={onOpen}
        disabled={!onOpen}
        className="flex-1 flex items-center gap-1.5 min-w-0 text-left disabled:cursor-default"
      >
        <span className={cn(
          'flex-1 text-sm leading-snug truncate font-medium',
          todo.completed ? 'line-through text-white/25' : 'text-white',
          todo.priority && PRIORITY_LABEL[todo.priority] && !todo.completed && 'opacity-90',
        )}>
          {todo.text}
        </span>
        {todo.endTime && <EndTimeBadge endTime={todo.endTime} />}
      </button>

      {/* Open details */}
      {onOpen && (
        <button
          onClick={onOpen}
          className="shrink-0 flex items-center justify-center w-8 h-8 rounded-xl text-white/15 hover:text-white/60 hover:bg-white/8 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
          aria-label="Open task details"
        >
          <ChevronRight size={14} />
        </button>
      )}

      {/* Delete */}
      <button
        onClick={onDelete}
        className="shrink-0 flex items-center justify-center w-8 h-8 rounded-xl text-white/15 hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
        aria-label="Delete todo"
      >
        <X size={14} />
      </button>
    </div>
  );
}
