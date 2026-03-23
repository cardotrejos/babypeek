import type { QueryClient } from "@tanstack/react-query";

import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

import { AppDevtools } from "@/components/devtools";
import { GlobalOverlays } from "@/components/global-overlays";
import { Toaster } from "@/components/ui/sonner";

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
      {/* Story 5.7: session recovery (deferred via GlobalOverlays) */}
      <GlobalOverlays />
      <Outlet />
      <Toaster richColors />
      <AppDevtools />
    </>
  );
}
