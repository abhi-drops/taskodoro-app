import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { MobileLayout } from '@/components/mobile/MobileLayout'
import { Sidebar } from '@/components/Sidebar'
import { BoardHeader } from '@/components/BoardHeader'
import { Board } from '@/components/Board'
import { CreateNameDialog } from '@/components/dialogs/CreateNameDialog'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'

export const Route = createFileRoute('/_app/workspace/$workspaceId/')({
  component: WorkspaceIndex,
})

function WorkspaceIndex() {
  const { workspaceId } = Route.useParams()
  const { state, dispatch, isLoaded } = useAppStore()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const foundRef = useRef(false)

  const [newWorkspaceOpen, setNewWorkspaceOpen] = useState(false)
  const [newGroupOpen, setNewGroupOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const workspace = state.workspaces.find(w => w.id === workspaceId)
  if (workspace) foundRef.current = true

  // Sync store's activeWorkspaceId from URL
  useEffect(() => {
    if (workspace && state.activeWorkspaceId !== workspaceId) {
      dispatch({ type: 'SET_ACTIVE_WORKSPACE', payload: { id: workspaceId } })
    }
  }, [workspaceId, workspace, state.activeWorkspaceId, dispatch])

  // Redirect to first group as soon as one exists
  useEffect(() => {
    if (!workspace) return
    const firstGroup = workspace.groups[0]
    if (firstGroup) {
      navigate({
        to: '/workspace/$workspaceId/group/$groupId',
        params: { workspaceId, groupId: firstGroup.id },
        replace: true,
      })
    }
  }, [workspace, workspaceId, navigate])

  // Redirect to root if workspace truly doesn't exist (with delay to avoid new-workspace race)
  useEffect(() => {
    if (!isLoaded || workspace) return
    const timer = setTimeout(() => {
      if (!foundRef.current) {
        navigate({ to: '/', replace: true })
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [isLoaded, workspace, navigate])

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Workspace not found yet — wait for state
  if (!workspace) return null

  // Workspace has groups — redirect effect above will fire, render nothing in the meantime
  if (workspace.groups.length > 0) return null

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter}>
      {isMobile ? (
        <MobileLayout
          workspaces={state.workspaces}
          activeWorkspace={workspace}
          activeWorkspaceId={workspaceId}
          activeGroupId={null}
          onSetActiveGroup={() => {}}
          onSelectWorkspace={handleSelectWorkspace}
          onDeleteWorkspace={id => dispatch({ type: 'DELETE_WORKSPACE', payload: { id } })}
          onNewWorkspace={() => setNewWorkspaceOpen(true)}
          onNewGroup={() => setNewGroupOpen(true)}
          onAddTodo={() => {}}
          onToggleTodo={() => {}}
          onDeleteTodo={() => {}}
          onDeleteGroup={() => {}}
          onOpenTask={() => {}}
          onOpenPomodoro={() => {}}
          onOpenSearch={() => {}}
        />
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
            <BoardHeader
              workspaceName={workspace.name}
              onNewGroup={() => setNewGroupOpen(true)}
              onToggleSidebar={() => setSidebarOpen(true)}
              onOpenPomodoro={() => {}}
              onOpenSearch={() => {}}
            />
            <Board
              workspace={workspace}
              onAddTodo={() => {}}
              onToggleTodo={() => {}}
              onDeleteTodo={() => {}}
              onDeleteGroup={() => {}}
              onOpenTask={() => {}}
            />
          </div>
        </div>
      )}

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
          dispatch({ type: 'ADD_GROUP', payload: { workspaceId, name } })
          // redirect effect above will pick up the new group and navigate to it
        }}
        title="New Group"
        placeholder="Group name…"
      />
    </DndContext>
  )
}
