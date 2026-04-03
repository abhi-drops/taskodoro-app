import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Trash2, LayoutList } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { TodoCard } from '@/components/TodoCard';
import type { Group } from '@/types/index';

interface Props {
  group: Group;
  workspaceId: string;
  onAddTodo: (text: string) => void;
  onToggleTodo: (todoId: string) => void;
  onDeleteTodo: (todoId: string) => void;
  onDeleteGroup: () => void;
}

export function GroupColumn({ group, workspaceId: _workspaceId, onAddTodo, onToggleTodo, onDeleteTodo, onDeleteGroup }: Props) {
  const [inputValue, setInputValue] = useState('');

  const { setNodeRef, isOver } = useDroppable({ id: group.id });

  const completedCount = group.todos.filter(t => t.completed).length;

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    onAddTodo(trimmed);
    setInputValue('');
  }

  return (
    <div className="flex flex-col w-72 shrink-0 rounded-xl border border-border bg-muted/40 shadow-sm">
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <LayoutList size={14} className="text-muted-foreground shrink-0" />
        <span className="flex-1 font-semibold text-sm truncate">{group.name}</span>
        <Badge variant="secondary" className="text-[10px] font-mono h-5 px-1.5">
          {completedCount}/{group.todos.length}
        </Badge>
        <Tooltip>
          <TooltipTrigger render={
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={onDeleteGroup}
              aria-label="Delete group"
            />
          }>
            <Trash2 size={13} />
          </TooltipTrigger>
          <TooltipContent>Delete group</TooltipContent>
        </Tooltip>
      </div>

      {/* Todo list droppable area */}
      <ScrollArea className="flex-1 px-2" style={{ maxHeight: 'calc(100vh - 220px)' }}>
        <SortableContext
          items={group.todos.map(t => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div
            ref={setNodeRef}
            className={cn(
              'flex flex-col gap-1.5 min-h-16 pb-2 transition-colors rounded-lg',
              isOver && 'bg-primary/5 ring-1 ring-primary/20',
            )}
          >
            {group.todos.length === 0 && (
              <div className="flex items-center justify-center h-16 text-xs text-muted-foreground/60">
                Drop todos here
              </div>
            )}
            {group.todos.map(todo => (
              <TodoCard
                key={todo.id}
                todo={todo}
                onToggle={() => onToggleTodo(todo.id)}
                onDelete={() => onDeleteTodo(todo.id)}
              />
            ))}
          </div>
        </SortableContext>
      </ScrollArea>

      {/* Add todo input */}
      <div className="px-2 pb-2 pt-1">
        <form onSubmit={handleAddSubmit}>
          <Input
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Add a todo…"
            className="h-8 text-xs bg-background"
          />
        </form>
      </div>
    </div>
  );
}
