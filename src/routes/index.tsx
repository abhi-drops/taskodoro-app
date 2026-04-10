import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { CheckSquare } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { CreateNameDialog } from '@/components/dialogs/CreateNameDialog'

export const Route = createFileRoute('/')({
  component: IndexRoute,
})

function IndexRoute() {
  const { state, dispatch, isLoaded } = useAppStore()
  const navigate = useNavigate()
  const [newWorkspaceOpen, setNewWorkspaceOpen] = useState(false)

  useEffect(() => {
    if (!isLoaded) return
    const ws = state.workspaces[0]
    if (!ws) return
    const group = ws.groups[0]
    if (group) {
      navigate({ to: '/workspace/$workspaceId/group/$groupId', params: { workspaceId: ws.id, groupId: group.id }, replace: true })
    } else {
      navigate({ to: '/workspace/$workspaceId', params: { workspaceId: ws.id }, replace: true })
    }
  }, [isLoaded, state.workspaces, navigate])

  if (!isLoaded) return null

  return (
    <div className="flex flex-col h-[100dvh] items-center justify-center gap-5 text-center px-6"
      style={{ paddingTop: 'env(safe-area-inset-top)', background: 'oklch(0.07 0.005 30)' }}>
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
      <CreateNameDialog
        open={newWorkspaceOpen}
        onOpenChange={setNewWorkspaceOpen}
        onConfirm={name => dispatch({ type: 'ADD_WORKSPACE', payload: { name } })}
        title="New Workspace"
        placeholder="Workspace name…"
      />
    </div>
  )
}
