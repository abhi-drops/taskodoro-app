import { useState, useRef, useCallback, useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ChevronDown, Plus, Trash2, LayoutList, Settings, Timer, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TodoCard } from '@/components/TodoCard';
import { WorkspaceSheet } from '@/components/mobile/WorkspaceSheet';
import { GroupSettingsSheet } from '@/components/GroupSettingsSheet';
import { useAppStore } from '@/store/useAppStore';
import { applyGroupView } from '@/lib/todoView';
import type { Workspace, Group } from '@/types/index';

interface Props {
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  activeWorkspaceId: string | null;
  activeGroupId: string | null;
  onSetActiveGroup: (id: string) => void;
  onSelectWorkspace: (id: string) => void;
  onDeleteWorkspace: (id: string) => void;
  onNewWorkspace: () => void;
  onNewGroup: () => void;
  onAddTodo: (groupId: string, text: string) => void;
  onToggleTodo: (groupId: string, todoId: string) => void;
  onDeleteTodo: (groupId: string, todoId: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onOpenTask: (groupId: string, todoId: string) => void;
  onOpenPomodoro: () => void;
  onOpenSearch: () => void;
}

export function MobileLayout({
  workspaces,
  activeWorkspace,
  activeWorkspaceId,
  activeGroupId,
  onSetActiveGroup,
  onSelectWorkspace,
  onDeleteWorkspace,
  onNewWorkspace,
  onNewGroup,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
  onDeleteGroup,
  onOpenTask,
  onOpenPomodoro,
  onOpenSearch,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);

  const activeGroup = activeWorkspace.groups.find(g => g.id === activeGroupId) ?? activeWorkspace.groups[0] ?? null;

  const handleAddSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!addInputRef.current || !activeGroup) return;
    const text = addInputRef.current.value.trim();
    if (!text) return;
    onAddTodo(activeGroup.id, text);
    addInputRef.current.value = '';
  }, [activeGroup, onAddTodo]);

  return (
    <div
      className="flex flex-col h-[100dvh] overflow-hidden"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        background: 'oklch(0.07 0.005 30)',
      }}
    >
      {/* Header */}
      <header className="flex items-center gap-2 px-4 h-14 shrink-0 border-b border-white/8">
        <button
          onClick={() => setSheetOpen(true)}
          className="flex items-center gap-1.5 flex-1 min-w-0 py-1"
          aria-label="Switch workspace"
        >
          <span className="font-bold text-base text-white truncate">{activeWorkspace.name}</span>
          <ChevronDown size={15} className="text-white/40 shrink-0" />
        </button>

        <button
          onClick={onOpenSearch}
          className="btn-spring-icon flex items-center justify-center w-10 h-10 bg-white/8 text-white/60 hover:text-white hover:bg-white/15 shrink-0"
          aria-label="Search tasks"
        >
          <Search size={17} />
        </button>
        <button
          onClick={onOpenPomodoro}
          className="btn-spring-icon flex items-center justify-center w-10 h-10 bg-white/8 text-white/60 hover:text-white hover:bg-white/15 shrink-0"
          aria-label="Pomodoro timer"
        >
          <Timer size={17} />
        </button>
        <button
          onClick={onNewGroup}
          className="btn-spring flex items-center gap-1.5 bg-primary text-white px-3.5 h-9 text-sm font-semibold shrink-0 shadow-lg shadow-primary/30"
          aria-label="New group"
        >
          <Plus size={15} />
          Group
        </button>
      </header>

      {/* Group tabs */}
      {activeWorkspace.groups.length > 0 && (
        <div className="shrink-0 border-b border-white/8">
          <div className="flex gap-1.5 px-3 py-2 overflow-x-auto no-scrollbar">
            {activeWorkspace.groups.map(group => (
              <GroupTab
                key={group.id}
                group={group}
                isActive={group.id === activeGroup?.id}
                onSelect={() => onSetActiveGroup(group.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 min-h-0 flex flex-col">
        {activeWorkspace.groups.length === 0 ? (
          <EmptyGroups onNewGroup={onNewGroup} />
        ) : activeGroup ? (
          <ActiveGroupView
            key={activeGroup.id}
            group={activeGroup}
            allGroups={activeWorkspace.groups}
            onToggleTodo={todoId => onToggleTodo(activeGroup.id, todoId)}
            onDeleteTodo={todoId => onDeleteTodo(activeGroup.id, todoId)}
            onDeleteGroup={() => onDeleteGroup(activeGroup.id)}
            onOpenTask={todoId => onOpenTask(activeGroup.id, todoId)}
          />
        ) : null}
      </div>

      {/* Add todo input bar */}
      {activeGroup && (
        <div
          className="shrink-0 border-t border-white/8 px-3 py-2"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' }}
        >
          <form onSubmit={handleAddSubmit} className="flex gap-2">
            <input
              ref={addInputRef}
              placeholder="Add a todo…"
              className="flex-1 h-12 rounded-2xl bg-white/8 border border-white/10 text-white text-sm px-4 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-white/12 transition-all"
            />
            <button
              type="submit"
              className="btn-spring-icon flex items-center justify-center w-12 h-12 bg-primary text-white shrink-0 shadow-lg shadow-primary/30"
              aria-label="Add todo"
            >
              <Plus size={18} />
            </button>
          </form>
        </div>
      )}

      {sheetOpen && (
        <WorkspaceSheet
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          onSelectWorkspace={onSelectWorkspace}
          onDeleteWorkspace={onDeleteWorkspace}
          onNewWorkspace={onNewWorkspace}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </div>
  );
}

// ─── GroupTab ─────────────────────────────────────────────────────────────────

interface GroupTabProps {
  group: { id: string; name: string; todos: { completed: boolean }[] };
  isActive: boolean;
  onSelect: () => void;
}

function GroupTab({ group, isActive, onSelect }: GroupTabProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `tab:${group.id}` });
  const count = group.todos.filter(t => !t.completed).length;

  return (
    <div ref={setNodeRef}>
      <button
        onClick={onSelect}
        aria-pressed={isActive}
        className={cn(
          'btn-spring-pill flex items-center gap-1.5 whitespace-nowrap px-3.5 h-8 text-sm font-semibold shrink-0',
          isActive
            ? 'bg-primary text-white shadow-md shadow-primary/30'
            : 'bg-white/8 text-white/50 hover:text-white hover:bg-white/15',
          isOver && !isActive && 'ring-2 ring-primary/50 bg-primary/15 text-white',
        )}
      >
        {group.name}
        {count > 0 && (
          <span className={cn(
            'text-xs rounded-full px-1.5 min-w-[1.25rem] text-center font-bold',
            isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60',
          )}>
            {count}
          </span>
        )}
      </button>
    </div>
  );
}

// ─── ActiveGroupView ───────────────────────────────────────────────────────────

interface ActiveGroupViewProps {
  group: Group;
  allGroups: Group[];
  onToggleTodo: (todoId: string) => void;
  onDeleteTodo: (todoId: string) => void;
  onDeleteGroup: () => void;
  onOpenTask: (todoId: string) => void;
}

function ActiveGroupView({ group, allGroups, onToggleTodo, onDeleteTodo, onDeleteGroup, onOpenTask }: ActiveGroupViewProps) {
  const { setNodeRef, isOver } = useDroppable({ id: group.id });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { dispatch, state } = useAppStore();
  const workspaceId = state.activeWorkspaceId ?? '';
  const done = group.todos.filter(t => t.completed).length;
  const total = group.todos.length;
  const pct = total > 0 ? (done / total) * 100 : 0;

  const visibleTodos = useMemo(
    () => applyGroupView(group.todos, group.settings?.sortBy, group.settings?.filterBy),
    [group.todos, group.settings?.sortBy, group.settings?.filterBy],
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Group meta bar */}
      <div className="flex items-center gap-2 px-4 py-2 shrink-0">
        <LayoutList size={13} className="text-white/30" />
        <span className="text-xs text-white/40 font-medium flex-1">{done}/{total} done</span>

        {/* Mini progress bar */}
        {total > 0 && (
          <div className="flex-1 max-w-[80px] h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-orange-400 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}

        <button
          onClick={() => setSettingsOpen(true)}
          className="btn-spring-icon flex items-center justify-center w-9 h-9 text-white/25 hover:text-white hover:bg-white/8"
          aria-label="Group settings"
        >
          <Settings size={14} />
        </button>
        <button
          onClick={onDeleteGroup}
          className="btn-spring-icon flex items-center justify-center w-9 h-9 text-white/25 hover:text-red-400 hover:bg-red-400/10"
          aria-label="Delete group"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Scrollable todo list */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 overflow-y-auto px-3 pb-2 min-h-0 no-scrollbar transition-colors rounded-2xl',
          isOver && 'bg-primary/5',
        )}
      >
        <SortableContext items={group.todos.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {group.todos.length === 0 && (
            <div className="flex items-center justify-center h-32 text-sm text-white/25">
              No todos yet — add one below
            </div>
          )}
          {group.todos.length > 0 && visibleTodos.length === 0 && (
            <div className="flex items-center justify-center h-32 text-sm text-white/25">
              No todos match the current filter
            </div>
          )}
          <div className="flex flex-col gap-2 pt-1">
            {visibleTodos.map((todo, i) => (
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

// ─── EmptyGroups ──────────────────────────────────────────────────────────────

function EmptyGroups({ onNewGroup }: { onNewGroup: () => void }) {
  return (
    <div className="flex flex-col flex-1 items-center justify-center gap-4 px-6">
      <div className="rounded-full bg-white/8 p-5 border border-white/10">
        <LayoutList size={28} className="text-white/30" />
      </div>
      <p className="text-sm font-medium text-white/40">No groups yet</p>
      <button
        onClick={onNewGroup}
        className="btn-spring text-sm text-primary font-semibold px-4 py-2 bg-primary/10 hover:bg-primary/20"
      >
        Create your first group →
      </button>
    </div>
  );
}
