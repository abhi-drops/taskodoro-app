import { createRootRoute, Outlet } from '@tanstack/react-router'
import { useEffect } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppProvider } from '@/store/useAppStore'
import { triggerHapticTap } from '@/lib/haptics'

function RootLayout() {
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Element | null
      if (!target) return
      const button = target.closest('button')
      if (!button) return
      if (button.disabled) return
      triggerHapticTap()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  return (
    <TooltipProvider>
      <AppProvider>
        <Outlet />
      </AppProvider>
    </TooltipProvider>
  )
}

export const Route = createRootRoute({ component: RootLayout })
