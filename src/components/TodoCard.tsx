import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Clock, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Todo, TaskPriority } from '@/types/index';

const PRIORITY_DOT: Record<TaskPriority, string> = {
  low:    'bg-muted-foreground/40',
  medium: 'bg-blue-500',
  high:   'bg-amber-500',
  urgent: 'bg-red-500',
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
      'flex items-center gap-0.5 text-[10px] font-medium rounded px-1 py-0.5 shrink-0',
      isOverdue
        ? 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30'
        : diff < 3600000
          ? 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30'
          : 'text-muted-foreground bg-muted',
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
}

export function TodoCard({ todo, onToggle, onDelete, onOpen, isDragOverlay = false }: Props) {
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
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      };

  const colorBorderStyle = todo.color
    ? { borderLeftColor: todo.color, borderLeftWidth: '3px' }
    : {};

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={{ ...style, ...colorBorderStyle }}
      className={cn(
        'group flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-3 shadow-sm',
        isDragging && !isDragOverlay && 'opacity-40',
        isDragOverlay && 'shadow-xl rotate-1 cursor-grabbing',
        'transition-shadow hover:shadow-md',
      )}
    >
      {/* Drag handle */}
      <button
        {...(isDragOverlay ? {} : { ...attributes, ...listeners })}
        className="flex items-center justify-center w-8 h-8 cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing shrink-0 rounded"
        aria-label="Drag to reorder"
        tabIndex={-1}
      >
        <GripVertical size={18} />
      </button>

      {/* Priority dot */}
      {todo.priority && (
        <span className={cn('w-2 h-2 rounded-full shrink-0', PRIORITY_DOT[todo.priority])} />
      )}

      {/* SN badge */}
      <Badge variant="outline" className="shrink-0 text-xs font-mono px-1.5 py-0 h-5 text-muted-foreground">
        #{todo.sn}
      </Badge>

      {/* Checkbox */}
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={onToggle}
        className="shrink-0 accent-primary cursor-pointer w-5 h-5"
        aria-label={`Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'complete'}`}
      />

      {/* Text + badges — tappable to open details */}
      <button
        onClick={onOpen}
        disabled={!onOpen}
        className="flex-1 flex items-center gap-1.5 min-w-0 text-left disabled:cursor-default"
      >
        <span className={cn('flex-1 text-sm leading-snug truncate', todo.completed && 'line-through text-muted-foreground')}>
          {todo.text}
        </span>
        {todo.endTime && <EndTimeBadge endTime={todo.endTime} />}
      </button>

      {/* Open details icon (desktop subtle cue) */}
      {onOpen && (
        <button
          onClick={onOpen}
          className="shrink-0 flex items-center justify-center w-7 h-7 rounded text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
          aria-label="Open task details"
        >
          <ChevronRight size={14} />
        </button>
      )}

      {/* Delete */}
      <button
        onClick={onDelete}
        className="shrink-0 flex items-center justify-center w-8 h-8 rounded text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
        aria-label="Delete todo"
      >
        <X size={15} />
      </button>
    </div>
  );
}
