import { lazy, Suspense } from "react";

const LazyDevtools =
  import.meta.env.DEV
    ? lazy(async () => {
        const [{ ReactQueryDevtools }, { TanStackRouterDevtools }] = await Promise.all([
          import("@tanstack/react-query-devtools"),
          import("@tanstack/react-router-devtools"),
        ]);
        function DevtoolsBundle() {
          return (
            <>
              <TanStackRouterDevtools position="bottom-left" />
              <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
            </>
          );
        }
        return { default: DevtoolsBundle };
      })
    : null;

export function AppDevtools() {
  if (!LazyDevtools) return null;

  return (
    <Suspense fallback={null}>
      <LazyDevtools />
    </Suspense>
  );
}
