import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";

import Loader from "./components/loader";
import { routeTree } from "./routeTree.gen";

// Create query client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

export const getRouter = () => {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    context: { queryClient },
    defaultPendingComponent: () => <Loader />,
    defaultNotFoundComponent: () => <div>Not Found</div>,
    defaultErrorComponent: ({ error, reset }) => (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="font-display text-2xl text-charcoal">We ran into a hiccup</h1>
          <p className="text-warm-gray">
            Please try again. If this keeps happening, reloading the page usually helps.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="px-6 py-3 bg-coral text-white rounded-lg hover:bg-coral/90 transition-colors"
          >
            Try Again
          </button>
          {import.meta.env.DEV && error instanceof Error && (
            <pre className="text-left text-xs text-red-600 bg-red-50 p-3 rounded overflow-auto">
              {error.message}
            </pre>
          )}
        </div>
      </div>
    ),
    Wrap: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
  return router;
};

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
