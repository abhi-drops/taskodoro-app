import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppProvider } from '@/store/useAppStore'

export const Route = createRootRoute({
  component: () => (
    <TooltipProvider>
      <AppProvider>
        <Outlet />
      </AppProvider>
    </TooltipProvider>
  ),
})
