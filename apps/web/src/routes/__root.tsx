import type { QueryClient } from "@tanstack/react-query";

import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Helmet } from "react-helmet-async";

import { Toaster } from "@/components/ui/sonner";
import { SessionRecoveryPrompt } from "@/components/session-recovery-prompt";
import { OfflineBanner } from "@/components/offline-banner";

export interface RouterAppContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootDocument,
});

function RootDocument() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "BabyPeek",
    "url": "https://babypeek.io",
    "logo": "https://babypeek.io/logo.png",
    "description": "AI-powered baby portrait generator from 4D ultrasound images.",
    "sameAs": [],
  };

  return (
    <>
      <Helmet>
        <link rel="canonical" href="https://babypeek.io/" />
      </Helmet>

      {/* Organization JSON-LD schema — included on all pages */}
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(organizationSchema)}
        </script>
      </Helmet>

      {/* Skip link for keyboard navigation - WCAG 2.4.1 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-charcoal focus:text-white focus:px-4 focus:py-2 focus:rounded"
      >
        Skip to main content
      </a>
      <OfflineBanner />
      <Outlet />
      {/* Story 5.7: Session recovery prompt for mobile users */}
      <SessionRecoveryPrompt />
      <Toaster richColors />
      <TanStackRouterDevtools position="bottom-left" />
      <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
    </>
  );
}
