import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Todo } from '@/types/index';

interface Props {
  todo: Todo;
  onToggle: () => void;
  onDelete: () => void;
  isDragOverlay?: boolean;
}

export function TodoCard({ todo, onToggle, onDelete, isDragOverlay = false }: Props) {
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

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-3 shadow-sm',
        isDragging && !isDragOverlay && 'opacity-40',
        isDragOverlay && 'shadow-xl rotate-1 cursor-grabbing',
        'transition-shadow hover:shadow-md',
      )}
    >
      {/* Drag handle — generous touch target */}
      <button
        {...(isDragOverlay ? {} : { ...attributes, ...listeners })}
        className="flex items-center justify-center w-8 h-8 cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing shrink-0 rounded"
        aria-label="Drag to reorder"
        tabIndex={-1}
      >
        <GripVertical size={18} />
      </button>

      {/* SN badge */}
      <Badge variant="outline" className="shrink-0 text-xs font-mono px-1.5 py-0 h-5 text-muted-foreground">
        #{todo.sn}
      </Badge>

      {/* Checkbox — larger touch target */}
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={onToggle}
        className="shrink-0 accent-primary cursor-pointer w-5 h-5"
        aria-label={`Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'complete'}`}
      />

      {/* Text */}
      <span className={cn('flex-1 text-sm leading-snug', todo.completed && 'line-through text-muted-foreground')}>
        {todo.text}
      </span>

      {/* Delete — always visible on mobile, hover-only on desktop */}
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
