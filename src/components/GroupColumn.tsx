import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Trash2, LayoutList, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { TodoCard } from '@/components/TodoCard';
import { GroupSettingsSheet } from '@/components/GroupSettingsSheet';
import { useAppStore } from '@/store/useAppStore';
import type { Group } from '@/types/index';

interface Props {
  group: Group;
  allGroups: Group[];
  onAddTodo: (text: string) => void;
  onToggleTodo: (todoId: string) => void;
  onDeleteTodo: (todoId: string) => void;
  onDeleteGroup: () => void;
  onOpenTask: (todoId: string) => void;
}

export function GroupColumn({ group, allGroups, onAddTodo, onToggleTodo, onDeleteTodo, onDeleteGroup, onOpenTask }: Props) {
  const [inputValue, setInputValue] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { dispatch, state } = useAppStore();
  const workspaceId = state.activeWorkspaceId ?? '';

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
    <div className="flex flex-col w-[82vw] sm:w-72 shrink-0 rounded-xl border border-border bg-muted/40 shadow-sm h-[calc(100dvh-7rem)]">
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2 shrink-0">
        <LayoutList size={16} className="text-muted-foreground shrink-0" />
        <span className="flex-1 font-semibold text-sm truncate">{group.name}</span>
        <Badge variant="secondary" className="text-xs font-mono h-5 px-1.5">
          {completedCount}/{group.todos.length}
        </Badge>
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center justify-center w-8 h-8 rounded text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Group settings"
        >
          <Settings size={15} />
        </button>
        <button
          onClick={onDeleteGroup}
          className="flex items-center justify-center w-8 h-8 rounded text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
          aria-label="Delete group"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Todo list droppable area */}
      <ScrollArea className="flex-1 min-h-0 px-2">
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
                onOpen={() => onOpenTask(todo.id)}
              />
            ))}
          </div>
        </SortableContext>
      </ScrollArea>

      {/* Add todo input */}
      <div className="px-2 pb-3 pt-1 shrink-0">
        <form onSubmit={handleAddSubmit}>
          <Input
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Add a todo…"
            className="h-10 text-sm bg-background"
          />
        </form>
      </div>

      {/* Group settings sheet */}
      {settingsOpen && (
        <GroupSettingsSheet
          group={group}
          allGroups={allGroups}
          workspaceId={workspaceId}
          onClose={() => setSettingsOpen(false)}
          dispatch={dispatch}
        />
      )}
    </div>
  );
}
