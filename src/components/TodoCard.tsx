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
        'group flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 shadow-sm',
        isDragging && !isDragOverlay && 'opacity-40',
        isDragOverlay && 'shadow-xl rotate-1 cursor-grabbing',
        'transition-shadow hover:shadow-md',
      )}
    >
      {/* Drag handle */}
      <button
        {...(isDragOverlay ? {} : { ...attributes, ...listeners })}
        className="cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing shrink-0"
        aria-label="Drag to reorder"
        tabIndex={-1}
      >
        <GripVertical size={15} />
      </button>

      {/* SN badge */}
      <Badge variant="outline" className="shrink-0 text-[10px] font-mono px-1.5 py-0 h-5 text-muted-foreground">
        #{todo.sn}
      </Badge>

      {/* Checkbox */}
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={onToggle}
        className="shrink-0 accent-primary cursor-pointer w-4 h-4"
        aria-label={`Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'complete'}`}
      />

      {/* Text */}
      <span className={cn('flex-1 text-sm leading-snug', todo.completed && 'line-through text-muted-foreground')}>
        {todo.text}
      </span>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-destructive transition-opacity"
        aria-label="Delete todo"
      >
        <X size={14} />
      </button>
    </div>
  );
}
