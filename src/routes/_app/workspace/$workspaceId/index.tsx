import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'

export const Route = createFileRoute('/_app/workspace/$workspaceId/')({
  component: WorkspaceIndex,
})

function WorkspaceIndex() {
  const { workspaceId } = Route.useParams()
  const { state, dispatch, isLoaded } = useAppStore()
  const navigate = useNavigate()

  const workspace = state.workspaces.find(w => w.id === workspaceId)

  // Sync store's activeWorkspaceId from URL
  useEffect(() => {
    if (workspace && state.activeWorkspaceId !== workspaceId) {
      dispatch({ type: 'SET_ACTIVE_WORKSPACE', payload: { id: workspaceId } })
    }
  }, [workspaceId, workspace, state.activeWorkspaceId, dispatch])

  // Redirect to first group if groups exist
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

  // Redirect to root if workspace was deleted
  useEffect(() => {
    if (isLoaded && !workspace) {
      navigate({ to: '/', replace: true })
    }
  }, [isLoaded, workspace, navigate])

  return null
}
