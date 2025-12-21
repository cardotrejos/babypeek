import type { QueryClient } from "@tanstack/react-query"

import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"

import { Toaster } from "@/components/ui/sonner"
import { SessionRecoveryPrompt } from "@/components/session-recovery-prompt"

export interface RouterAppContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootDocument,
})

function RootDocument() {
  return (
    <>
      {/* Skip link for keyboard navigation - WCAG 2.4.1 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-charcoal focus:text-white focus:px-4 focus:py-2 focus:rounded"
      >
        Skip to main content
      </a>
      <Outlet />
      {/* Story 5.7: Session recovery prompt for mobile users */}
      <SessionRecoveryPrompt />
      <Toaster richColors />
      <TanStackRouterDevtools position="bottom-left" />
      <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
    </>
  )
}
