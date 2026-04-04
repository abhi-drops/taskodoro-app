import { useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppProvider, useAppStore } from '@/store/useAppStore';
import { Sidebar } from '@/components/Sidebar';
import { BoardHeader } from '@/components/BoardHeader';
import { Board } from '@/components/Board';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { TodoCard } from '@/components/TodoCard';
import { TaskDetailsSheet } from '@/components/TaskDetailsSheet';
import { CreateNameDialog } from '@/components/dialogs/CreateNameDialog';
import { CheckSquare, Loader2 } from 'lucide-react';
import type { Todo } from '@/types/index';
import type { PomodoroBlock } from '@/types/pomodoro';
import { PomodoroPlanner } from '@/components/pomodoro/PomodoroPlanner';
import { PomodoroTimer } from '@/components/pomodoro/PomodoroTimer';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

function AppInner() {
  const { state, dispatch, isLoaded } = useAppStore();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newWorkspaceOpen, setNewWorkspaceOpen] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [activeDragTodo, setActiveDragTodo] = useState<Todo | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [openTaskDetail, setOpenTaskDetail] = useState<{ todoId: string; groupId: string } | null>(null);
  const [pomodoroOpen, setPomodoroOpen] = useState(false);
  const [pomodoroBlocks, setPomodoroBlocks] = useState<PomodoroBlock[] | null>(null);

  const activeWorkspace = state.workspaces.find(w => w.id === state.activeWorkspaceId) ?? null;

  // Derive open todo — becomes null if todo is deleted, closing the sheet
  const openTodo = openTaskDetail
    ? (activeWorkspace?.groups
        .find(g => g.id === openTaskDetail.groupId)
        ?.todos.find(t => t.id === openTaskDetail.todoId) ?? null)
    : null;

  // Keep activeGroupId in sync: reset when workspace changes, default to first group
  useEffect(() => {
    if (!activeWorkspace) { setActiveGroupId(null); return; }
    const ids = activeWorkspace.groups.map(g => g.id);
    if (ids.length === 0) { setActiveGroupId(null); return; }
    setActiveGroupId(prev => (prev && ids.includes(prev) ? prev : ids[0]));
  }, [activeWorkspace?.id, activeWorkspace?.groups.map(g => g.id).join(',')]);

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

  function handleDragOver(event: DragOverEvent) {
    if (!activeWorkspace) return;
    const rawOverId = event.over?.id as string | undefined;
    if (!rawOverId?.startsWith('tab:')) return;
    const tabGroupId = rawOverId.slice(4);
    // Switch active group mid-drag so the group content mounts as a drop target
    setActiveGroupId(prev => (prev === tabGroupId ? prev : tabGroupId));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragTodo(null);
    const { active, over } = event;
    if (!over || !activeWorkspace) return;

    const activeId = active.id as string;
    const rawOverId = over.id as string;
    const overId = rawOverId.startsWith('tab:') ? rawOverId.slice(4) : rawOverId;

    if (activeId === overId) return;

    const sourceGroup = activeWorkspace.groups.find(g => g.todos.some(t => t.id === activeId));
    if (!sourceGroup) return;

    const targetGroup =
      activeWorkspace.groups.find(g => g.id === overId) ??
      activeWorkspace.groups.find(g => g.todos.some(t => t.id === overId));
    if (!targetGroup) return;

    if (rawOverId.startsWith('tab:') && sourceGroup.id !== targetGroup.id) {
      setActiveGroupId(targetGroup.id);
    }

    if (sourceGroup.id === targetGroup.id) {
      const oldIndex = sourceGroup.todos.findIndex(t => t.id === activeId);
      const newIndex = sourceGroup.todos.findIndex(t => t.id === overId);
      // newIndex === -1 means overId is the group container itself, not a todo — skip
      if (newIndex !== -1 && oldIndex !== newIndex) {
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

  const handleOpenTask = useCallback((groupId: string, todoId: string) => {
    setOpenTaskDetail({ todoId, groupId });
  }, []);

  const handleCloseTask = useCallback(() => {
    setOpenTaskDetail(null);
  }, []);

  const handleMoveTask = useCallback((newGroupId: string) => {
    setOpenTaskDetail(prev => prev ? { todoId: prev.todoId, groupId: newGroupId } : null);
  }, []);

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const noWorkspaceScreen = (
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
  );

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      {isMobile ? (
        activeWorkspace ? (
          <MobileLayout
            workspaces={state.workspaces}
            activeWorkspace={activeWorkspace}
            activeWorkspaceId={state.activeWorkspaceId}
            activeGroupId={activeGroupId}
            onSetActiveGroup={setActiveGroupId}
            onSelectWorkspace={id => dispatch({ type: 'SET_ACTIVE_WORKSPACE', payload: { id } })}
            onDeleteWorkspace={id => dispatch({ type: 'DELETE_WORKSPACE', payload: { id } })}
            onNewWorkspace={() => setNewWorkspaceOpen(true)}
            onNewGroup={() => setNewGroupOpen(true)}
            onAddTodo={handleAddTodo}
            onToggleTodo={handleToggleTodo}
            onDeleteTodo={handleDeleteTodo}
            onDeleteGroup={handleDeleteGroup}
            onOpenTask={handleOpenTask}
            onOpenPomodoro={() => setPomodoroOpen(true)}
          />
        ) : (
          <div className="flex flex-col h-[100dvh] bg-background" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            {noWorkspaceScreen}
          </div>
        )
      ) : (
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
                  onOpenPomodoro={() => setPomodoroOpen(true)}
                />
                <Board
                  workspace={activeWorkspace}
                  onAddTodo={handleAddTodo}
                  onToggleTodo={handleToggleTodo}
                  onDeleteTodo={handleDeleteTodo}
                  onDeleteGroup={handleDeleteGroup}
                  onOpenTask={handleOpenTask}
                />
              </>
            ) : noWorkspaceScreen}
          </div>
        </div>
      )}

      <DragOverlay>
        {activeDragTodo && (
          <TodoCard
            todo={activeDragTodo}
            onToggle={() => {}}
            onDelete={() => {}}
            onOpen={() => {}}
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

      {/* Task details sheet — rendered at root level for correct z-ordering */}
      {openTodo && activeWorkspace && openTaskDetail && (
        <TaskDetailsSheet
          todo={openTodo}
          currentGroupId={openTaskDetail.groupId}
          workspaceId={activeWorkspace.id}
          allGroups={activeWorkspace.groups}
          isMobile={isMobile}
          onClose={handleCloseTask}
          onMove={handleMoveTask}
          dispatch={dispatch}
        />
      )}

      {/* Pomodoro Planner */}
      {pomodoroOpen && activeWorkspace && (
        <PomodoroPlanner
          workspace={activeWorkspace}
          onClose={() => setPomodoroOpen(false)}
          onStart={blocks => {
            setPomodoroBlocks(blocks);
            setPomodoroOpen(false);
          }}
        />
      )}

      {/* Pomodoro Timer */}
      {pomodoroBlocks && activeWorkspace && (
        <PomodoroTimer
          blocks={pomodoroBlocks}
          workspaceId={activeWorkspace.id}
          dispatch={dispatch}
          onClose={() => setPomodoroBlocks(null)}
        />
      )}
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
