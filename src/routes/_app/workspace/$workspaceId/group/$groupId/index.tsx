import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useCallback, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  rectIntersection,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type CollisionDetection,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CheckSquare } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { Sidebar } from '@/components/Sidebar'
import { BoardHeader } from '@/components/BoardHeader'
import { Board } from '@/components/Board'
import { MobileLayout } from '@/components/mobile/MobileLayout'
import { TodoCard } from '@/components/TodoCard'
import { TaskDetailsSheet } from '@/components/TaskDetailsSheet'
import { CreateNameDialog } from '@/components/dialogs/CreateNameDialog'
import { PomodoroPlanner } from '@/components/pomodoro/PomodoroPlanner'
import { PomodoroTimer } from '@/components/pomodoro/PomodoroTimer'
import { SearchPanel } from '@/components/SearchPanel'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { Todo } from '@/types/index'
import type { PomodoroBlock } from '@/types/pomodoro'

export const Route = createFileRoute('/_app/workspace/$workspaceId/group/$groupId/')({
  component: GroupRoute,
})

function GroupRoute() {
  const { workspaceId, groupId } = Route.useParams()
  const navigate = useNavigate()
  const { state, dispatch, isLoaded } = useAppStore()
  const isMobile = useIsMobile()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [newWorkspaceOpen, setNewWorkspaceOpen] = useState(false)
  const [newGroupOpen, setNewGroupOpen] = useState(false)
  const [activeDragTodo, setActiveDragTodo] = useState<Todo | null>(null)
  const [openTaskDetail, setOpenTaskDetail] = useState<{ todoId: string; groupId: string } | null>(null)
  const [pomodoroOpen, setPomodoroOpen] = useState(false)
  const [pomodoroBlocks, setPomodoroBlocks] = useState<PomodoroBlock[] | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)

  const activeWorkspace = state.workspaces.find(w => w.id === workspaceId) ?? null

  // Sync store's activeWorkspaceId from URL
  useEffect(() => {
    if (activeWorkspace && state.activeWorkspaceId !== workspaceId) {
      dispatch({ type: 'SET_ACTIVE_WORKSPACE', payload: { id: workspaceId } })
    }
  }, [workspaceId, activeWorkspace, state.activeWorkspaceId, dispatch])

  // Redirect away only after state is confirmed loaded (avoids race on initial render)
  useEffect(() => {
    if (!isLoaded || activeWorkspace) return
    if (state.workspaces.length === 0) {
      navigate({ to: '/', replace: true })
    } else {
      const ws = state.workspaces[0]
      const group = ws?.groups[0]
      if (ws && group) {
        navigate({ to: '/workspace/$workspaceId/group/$groupId', params: { workspaceId: ws.id, groupId: group.id }, replace: true })
      } else if (ws) {
        navigate({ to: '/workspace/$workspaceId', params: { workspaceId: ws.id }, replace: true })
      } else {
        navigate({ to: '/', replace: true })
      }
    }
  }, [isLoaded, activeWorkspace, state.workspaces, navigate])

  // Redirect if current group was deleted
  useEffect(() => {
    if (!activeWorkspace) return
    const groupExists = activeWorkspace.groups.some(g => g.id === groupId)
    if (!groupExists && activeWorkspace.groups.length > 0) {
      navigate({
        to: '/workspace/$workspaceId/group/$groupId',
        params: { workspaceId, groupId: activeWorkspace.groups[0].id },
        replace: true,
      })
    } else if (!groupExists) {
      navigate({ to: '/workspace/$workspaceId', params: { workspaceId }, replace: true })
    }
  }, [activeWorkspace, groupId, workspaceId, navigate])

  const openTodo = openTaskDetail
    ? (activeWorkspace?.groups
        .find(g => g.id === openTaskDetail.groupId)
        ?.todos.find(t => t.id === openTaskDetail.todoId) ?? null)
    : null

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Use the top-left corner of the dragged card when checking against group tabs,
  // so dragging near the left screen edge can still hit the first pill.
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const { droppableContainers, active, collisionRect } = args

    const tabContainers = droppableContainers.filter(c => (c.id as string).startsWith('tab:'))
    const otherContainers = droppableContainers.filter(c => !(c.id as string).startsWith('tab:'))

    if (tabContainers.length > 0) {
      // Build a 1×1 rect from the top-left corner of the dragged element
      const topLeftRect = {
        ...collisionRect,
        left: collisionRect.left,
        top: collisionRect.top,
        right: collisionRect.left + 1,
        bottom: collisionRect.top + 1,
        width: 1,
        height: 1,
      }
      const tabHits = rectIntersection({ ...args, droppableContainers: tabContainers, collisionRect: topLeftRect })
      if (tabHits.length > 0) return tabHits
    }

    return closestCenter({ ...args, droppableContainers: otherContainers, active })
  }, [])

  function handleDragStart(event: DragStartEvent) {
    if (!activeWorkspace) return
    const todoId = event.active.id as string
    for (const group of activeWorkspace.groups) {
      const todo = group.todos.find(t => t.id === todoId)
      if (todo) { setActiveDragTodo(todo); return }
    }
  }

  function handleDragOver(event: DragOverEvent) {
    if (!activeWorkspace) return
    const rawOverId = event.over?.id as string | undefined
    if (!rawOverId?.startsWith('tab:')) return
    const tabGroupId = rawOverId.slice(4)
    if (tabGroupId !== groupId) {
      navigate({
        to: '/workspace/$workspaceId/group/$groupId',
        params: { workspaceId, groupId: tabGroupId },
        replace: true,
      })
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragTodo(null)
    const { active, over } = event
    if (!over || !activeWorkspace) return

    const activeId = active.id as string
    const rawOverId = over.id as string
    const overId = rawOverId.startsWith('tab:') ? rawOverId.slice(4) : rawOverId

    if (activeId === overId) return

    const sourceGroup = activeWorkspace.groups.find(g => g.todos.some(t => t.id === activeId))
    if (!sourceGroup) return

    const targetGroup =
      activeWorkspace.groups.find(g => g.id === overId) ??
      activeWorkspace.groups.find(g => g.todos.some(t => t.id === overId))
    if (!targetGroup) return

    if (rawOverId.startsWith('tab:') && sourceGroup.id !== targetGroup.id) {
      navigate({
        to: '/workspace/$workspaceId/group/$groupId',
        params: { workspaceId, groupId: targetGroup.id },
        replace: true,
      })
    }

    if (sourceGroup.id === targetGroup.id) {
      const sortIsActive = sourceGroup.settings?.sortBy && sourceGroup.settings.sortBy !== 'none';
      if (!sortIsActive) {
        const oldIndex = sourceGroup.todos.findIndex(t => t.id === activeId)
        const newIndex = sourceGroup.todos.findIndex(t => t.id === overId)
        if (newIndex !== -1 && oldIndex !== newIndex) {
          dispatch({
            type: 'REORDER_TODO',
            payload: { workspaceId, groupId: sourceGroup.id, activeIndex: oldIndex, overIndex: newIndex },
          })
        }
      }
    } else {
      const overIndex = targetGroup.todos.findIndex(t => t.id === overId)
      dispatch({
        type: 'MOVE_TODO',
        payload: {
          workspaceId,
          todoId: activeId,
          fromGroupId: sourceGroup.id,
          toGroupId: targetGroup.id,
          overIndex: overIndex >= 0 ? overIndex : undefined,
        },
      })
    }
  }

  const handleAddTodo = useCallback((gId: string, text: string) => {
    dispatch({ type: 'ADD_TODO', payload: { workspaceId, groupId: gId, text } })
  }, [dispatch, workspaceId])

  const handleToggleTodo = useCallback((gId: string, todoId: string) => {
    dispatch({ type: 'TOGGLE_TODO', payload: { workspaceId, groupId: gId, todoId } })
  }, [dispatch, workspaceId])

  const handleDeleteTodo = useCallback((gId: string, todoId: string) => {
    dispatch({ type: 'DELETE_TODO', payload: { workspaceId, groupId: gId, todoId } })
  }, [dispatch, workspaceId])

  const handleDeleteGroup = useCallback((gId: string) => {
    dispatch({ type: 'DELETE_GROUP', payload: { workspaceId, groupId: gId } })
  }, [dispatch, workspaceId])

  const handleOpenTask = useCallback((gId: string, todoId: string) => {
    setOpenTaskDetail({ todoId, groupId: gId })
  }, [])

  const handleCloseTask = useCallback(() => {
    setOpenTaskDetail(null)
  }, [])

  const handleMoveTask = useCallback((newGroupId: string) => {
    setOpenTaskDetail(prev => prev ? { todoId: prev.todoId, groupId: newGroupId } : null)
  }, [])

  const handleSelectWorkspace = useCallback((id: string) => {
    dispatch({ type: 'SET_ACTIVE_WORKSPACE', payload: { id } })
    const ws = state.workspaces.find(w => w.id === id)
    const firstGroup = ws?.groups[0]
    if (firstGroup) {
      navigate({ to: '/workspace/$workspaceId/group/$groupId', params: { workspaceId: id, groupId: firstGroup.id } })
    } else if (ws) {
      navigate({ to: '/workspace/$workspaceId', params: { workspaceId: id } })
    }
  }, [state.workspaces, dispatch, navigate])

  const handleSetActiveGroup = useCallback((newGroupId: string) => {
    navigate({
      to: '/workspace/$workspaceId/group/$groupId',
      params: { workspaceId, groupId: newGroupId },
    })
  }, [workspaceId, navigate])

  const noWorkspaceScreen = (
    <div className="flex flex-col flex-1 items-center justify-center gap-5 text-center px-6" style={{ background: 'oklch(0.07 0.005 30)' }}>
      <div className="rounded-3xl bg-white/6 border border-white/8 p-5">
        <CheckSquare size={40} className="text-white/25" />
      </div>
      <div>
        <h2 className="font-black text-xl text-white">Welcome</h2>
        <p className="text-sm text-white/40 mt-1">Create a workspace to get started</p>
      </div>
      <button
        onClick={() => setNewWorkspaceOpen(true)}
        className="text-sm font-bold text-white px-5 py-2.5 rounded-2xl bg-primary/15 border border-primary/30 hover:bg-primary/25 transition-colors active:scale-95"
      >
        Create your first workspace →
      </button>
    </div>
  )

  return (
    <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      {isMobile ? (
        activeWorkspace ? (
          <MobileLayout
            workspaces={state.workspaces}
            activeWorkspace={activeWorkspace}
            activeWorkspaceId={workspaceId}
            activeGroupId={groupId}
            onSetActiveGroup={handleSetActiveGroup}
            onSelectWorkspace={handleSelectWorkspace}
            onDeleteWorkspace={id => dispatch({ type: 'DELETE_WORKSPACE', payload: { id } })}
            onNewWorkspace={() => setNewWorkspaceOpen(true)}
            onNewGroup={() => setNewGroupOpen(true)}
            onAddTodo={handleAddTodo}
            onToggleTodo={handleToggleTodo}
            onDeleteTodo={handleDeleteTodo}
            onDeleteGroup={handleDeleteGroup}
            onOpenTask={handleOpenTask}
            onOpenPomodoro={() => setPomodoroOpen(true)}
            onOpenSearch={() => setSearchOpen(true)}
          />
        ) : (
          <div className="flex flex-col h-[100dvh]" style={{ paddingTop: 'env(safe-area-inset-top)', background: 'oklch(0.07 0.005 30)' }}>
            {noWorkspaceScreen}
          </div>
        )
      ) : (
        <div className="flex h-screen overflow-hidden" style={{ background: 'oklch(0.07 0.005 30)' }}>
          <Sidebar
            workspaces={state.workspaces}
            activeWorkspaceId={workspaceId}
            onSelectWorkspace={handleSelectWorkspace}
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
                  onOpenSearch={() => setSearchOpen(true)}
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
        onConfirm={name => {
          const newId = crypto.randomUUID()
          dispatch({ type: 'ADD_WORKSPACE', payload: { name, id: newId } })
          navigate({ to: '/workspace/$workspaceId', params: { workspaceId: newId } })
        }}
        title="New Workspace"
        placeholder="Workspace name…"
      />
      <CreateNameDialog
        open={newGroupOpen}
        onOpenChange={setNewGroupOpen}
        onConfirm={name => {
          if (!activeWorkspace) return
          dispatch({ type: 'ADD_GROUP', payload: { workspaceId: activeWorkspace.id, name } })
        }}
        title="New Group"
        placeholder="Group name…"
      />

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

      {searchOpen && activeWorkspace && (
        <SearchPanel
          workspace={activeWorkspace}
          onOpenTask={(gId, todoId) => {
            setOpenTaskDetail({ todoId, groupId: gId })
            setSearchOpen(false)
          }}
          onClose={() => setSearchOpen(false)}
          isMobile={isMobile}
        />
      )}

      {pomodoroOpen && activeWorkspace && (
        <PomodoroPlanner
          workspace={activeWorkspace}
          onClose={() => setPomodoroOpen(false)}
          onStart={blocks => {
            setPomodoroBlocks(blocks)
            setPomodoroOpen(false)
          }}
        />
      )}

      {pomodoroBlocks && activeWorkspace && (
        <PomodoroTimer
          blocks={pomodoroBlocks}
          workspaceId={activeWorkspace.id}
          dispatch={dispatch}
          onClose={() => setPomodoroBlocks(null)}
        />
      )}
    </DndContext>
  )
}
