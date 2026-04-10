import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Trash2, Settings, Plus } from 'lucide-react';
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

  const done = group.todos.filter(t => t.completed).length;
  const total = group.todos.length;
  const pct = total > 0 ? (done / total) * 100 : 0;

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    onAddTodo(trimmed);
    setInputValue('');
  }

  return (
    <div
      className="flex flex-col w-[82vw] sm:w-72 shrink-0 rounded-3xl border border-white/8 h-[calc(100dvh-7rem)]"
      style={{ background: 'oklch(0.1 0.008 30)' }}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-3.5 pt-3.5 pb-2 shrink-0">
        <div className="flex-1 min-w-0">
          <span className="font-bold text-sm text-white truncate block">{group.name}</span>
          {/* Progress bar */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="flex-1 h-1 rounded-full bg-white/8 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-orange-400 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-white/25 font-mono shrink-0">{done}/{total}</span>
          </div>
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          className="btn-spring-icon flex items-center justify-center w-8 h-8 text-white/20 hover:text-white hover:bg-white/8"
          aria-label="Group settings"
        >
          <Settings size={14} />
        </button>
        <button
          onClick={onDeleteGroup}
          className="btn-spring-icon flex items-center justify-center w-8 h-8 text-white/20 hover:text-red-400 hover:bg-red-400/10"
          aria-label="Delete group"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Todo list */}
      <ScrollArea className="flex-1 min-h-0 px-2">
        <SortableContext items={group.todos.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div
            ref={setNodeRef}
            className={cn(
              'flex flex-col gap-1.5 min-h-16 pb-2 transition-all rounded-2xl',
              isOver && 'bg-primary/6 ring-1 ring-primary/20',
            )}
          >
            {group.todos.length === 0 && (
              <div className="flex items-center justify-center h-16 text-xs text-white/20">
                Drop todos here
              </div>
            )}
            {group.todos.map((todo, i) => (
              <TodoCard
                key={todo.id}
                todo={todo}
                index={i}
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
        <form onSubmit={handleAddSubmit} className="flex gap-1.5">
          <input
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Add a todo…"
            className="flex-1 h-10 rounded-2xl bg-white/6 border border-white/10 text-white text-sm px-3.5 placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-white/10 transition-all"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="btn-spring-icon flex items-center justify-center w-10 h-10 bg-primary text-white disabled:opacity-25 shrink-0"
            aria-label="Add todo"
          >
            <Plus size={16} />
          </button>
        </form>
      </div>

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
