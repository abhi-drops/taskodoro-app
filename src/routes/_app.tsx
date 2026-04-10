import { createFileRoute, Outlet, useRouter } from '@tanstack/react-router'
import { App as CapApp } from '@capacitor/app'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

export const Route = createFileRoute('/_app')({
  component: AppLayout,
})

function AppLayout() {
  const { isLoaded } = useAppStore()
  const router = useRouter()

  useEffect(() => {
    const listenerPromise = CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) router.history.back()
      else CapApp.exitApp()
    })
    return () => {
      listenerPromise.then(h => h.remove())
    }
  }, [router])

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'oklch(0.07 0.005 30)' }}>
        <Loader2 size={24} className="animate-spin text-white/30" />
      </div>
    )
  }

  return <Outlet />
}
