import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppProvider, useAppStore } from '@/store/useAppStore';
import { Sidebar } from '@/components/Sidebar';
import { BoardHeader } from '@/components/BoardHeader';
import { Board } from '@/components/Board';
import { TodoCard } from '@/components/TodoCard';
import { CreateNameDialog } from '@/components/dialogs/CreateNameDialog';
import { CheckSquare, Loader2 } from 'lucide-react';
import type { Todo } from '@/types/index';

function AppInner() {
  const { state, dispatch, isLoaded } = useAppStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newWorkspaceOpen, setNewWorkspaceOpen] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [activeDragTodo, setActiveDragTodo] = useState<Todo | null>(null);

  const activeWorkspace = state.workspaces.find(w => w.id === state.activeWorkspaceId) ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragStart(event: DragStartEvent) {
    if (!activeWorkspace) return;
    const todoId = event.active.id as string;
    for (const group of activeWorkspace.groups) {
      const todo = group.todos.find(t => t.id === todoId);
      if (todo) { setActiveDragTodo(todo); return; }
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragTodo(null);
    const { active, over } = event;
    if (!over || !activeWorkspace) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const sourceGroup = activeWorkspace.groups.find(g => g.todos.some(t => t.id === activeId));
    if (!sourceGroup) return;

    const targetGroup =
      activeWorkspace.groups.find(g => g.id === overId) ??
      activeWorkspace.groups.find(g => g.todos.some(t => t.id === overId));
    if (!targetGroup) return;

    if (sourceGroup.id === targetGroup.id) {
      const oldIndex = sourceGroup.todos.findIndex(t => t.id === activeId);
      const newIndex = sourceGroup.todos.findIndex(t => t.id === overId);
      if (oldIndex !== newIndex) {
        dispatch({
          type: 'REORDER_TODO',
          payload: { workspaceId: activeWorkspace.id, groupId: sourceGroup.id, activeIndex: oldIndex, overIndex: newIndex },
        });
      }
    } else {
      const overIndex = targetGroup.todos.findIndex(t => t.id === overId);
      dispatch({
        type: 'MOVE_TODO',
        payload: {
          workspaceId: activeWorkspace.id,
          todoId: activeId,
          fromGroupId: sourceGroup.id,
          toGroupId: targetGroup.id,
          overIndex: overIndex >= 0 ? overIndex : undefined,
        },
      });
    }
  }

  const workspaceId = activeWorkspace?.id ?? '';

  const handleAddTodo = useCallback((groupId: string, text: string) => {
    dispatch({ type: 'ADD_TODO', payload: { workspaceId, groupId, text } });
  }, [dispatch, workspaceId]);

  const handleToggleTodo = useCallback((groupId: string, todoId: string) => {
    dispatch({ type: 'TOGGLE_TODO', payload: { workspaceId, groupId, todoId } });
  }, [dispatch, workspaceId]);

  const handleDeleteTodo = useCallback((groupId: string, todoId: string) => {
    dispatch({ type: 'DELETE_TODO', payload: { workspaceId, groupId, todoId } });
  }, [dispatch, workspaceId]);

  const handleDeleteGroup = useCallback((groupId: string) => {
    dispatch({ type: 'DELETE_GROUP', payload: { workspaceId, groupId } });
  }, [dispatch, workspaceId]);

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar
          workspaces={state.workspaces}
          activeWorkspaceId={state.activeWorkspaceId}
          onSelectWorkspace={id => dispatch({ type: 'SET_ACTIVE_WORKSPACE', payload: { id } })}
          onDeleteWorkspace={id => dispatch({ type: 'DELETE_WORKSPACE', payload: { id } })}
          onNewWorkspace={() => setNewWorkspaceOpen(true)}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex flex-col flex-1 overflow-hidden">
          {activeWorkspace ? (
            <>
              <BoardHeader
                workspaceName={activeWorkspace.name}
                onNewGroup={() => setNewGroupOpen(true)}
                onToggleSidebar={() => setSidebarOpen(true)}
              />
              <Board
                workspace={activeWorkspace}
                onAddTodo={handleAddTodo}
                onToggleTodo={handleToggleTodo}
                onDeleteTodo={handleDeleteTodo}
                onDeleteGroup={handleDeleteGroup}
              />
            </>
          ) : (
            <div className="flex flex-col flex-1 items-center justify-center gap-4 text-center px-6">
              <div className="rounded-full bg-muted p-5">
                <CheckSquare size={40} className="text-muted-foreground" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Welcome to Workspaces</h2>
                <p className="text-sm text-muted-foreground mt-1">Create a workspace to get started</p>
              </div>
              <button
                onClick={() => setNewWorkspaceOpen(true)}
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Create your first workspace →
              </button>
            </div>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeDragTodo && (
          <TodoCard
            todo={activeDragTodo}
            onToggle={() => {}}
            onDelete={() => {}}
            isDragOverlay
          />
        )}
      </DragOverlay>

      <CreateNameDialog
        open={newWorkspaceOpen}
        onOpenChange={setNewWorkspaceOpen}
        onConfirm={name => dispatch({ type: 'ADD_WORKSPACE', payload: { name } })}
        title="New Workspace"
        placeholder="Workspace name…"
      />
      <CreateNameDialog
        open={newGroupOpen}
        onOpenChange={setNewGroupOpen}
        onConfirm={name => {
          if (!activeWorkspace) return;
          dispatch({ type: 'ADD_GROUP', payload: { workspaceId: activeWorkspace.id, name } });
        }}
        title="New Group"
        placeholder="Group name…"
      />
    </DndContext>
  );
}

export default function App() {
  return (
    <TooltipProvider>
      <AppProvider>
        <AppInner />
      </AppProvider>
    </TooltipProvider>
  );
}
