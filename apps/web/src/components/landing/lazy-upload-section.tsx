import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

const UploadSectionLazy = lazy(() =>
  import("./upload-section").then((m) => ({ default: m.UploadSection })),
);

let loadPromise: Promise<void> | null = null;

function getLoadPromise(): Promise<void> {
  if (!loadPromise) {
    loadPromise = import("./upload-section")
      .then(() => undefined)
      .catch((err) => {
        loadPromise = null;
        throw err;
      });
  }
  return loadPromise;
}

export function preloadUploadSection(): Promise<void> {
  return getLoadPromise();
}

function Placeholder() {
  return (
    <div
      className="rounded-2xl border border-warm-gray/15 bg-white/35 p-8 min-h-[280px]"
      aria-hidden="true"
    />
  );
}

export interface LazyUploadSectionProps {
  id?: string;
  /** After hero CTA: set true once `preloadUploadSection()` has been awaited (or attempted). */
  ctaPreloaded?: boolean;
}

export function LazyUploadSection({ id, ctaPreloaded = false }: LazyUploadSectionProps) {
  const [ioPrimed, setIoPrimed] = useState(false);
  const [moduleReady, setModuleReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const isMountedRef = useRef(true);
  const rootRef = useRef<HTMLDivElement>(null);

  const shouldFetch = ctaPreloaded || ioPrimed;

  const primeModule = useCallback(() => {
    setFailed(false);
    void getLoadPromise()
      .then(() => {
        if (isMountedRef.current) {
          setModuleReady(true);
        }
      })
      .catch(() => {
        if (isMountedRef.current) {
          setFailed(true);
        }
      });
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!shouldFetch) return;
    primeModule();
  }, [primeModule, shouldFetch]);

  useEffect(() => {
    if (typeof window.IntersectionObserver !== "function") {
      setIoPrimed(true);
      return;
    }
    const n = rootRef.current;
    if (!n) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setIoPrimed(true);
      },
      { rootMargin: "320px" },
    );
    io.observe(n);
    return () => io.disconnect();
  }, []);

  const handleRetry = useCallback(() => {
    loadPromise = null;
    primeModule();
  }, [primeModule]);

  return (
    <div id={id} ref={rootRef} className="relative">
      {failed ? (
        <div className="rounded-2xl border border-coral/25 bg-cream p-6 text-center space-y-4">
          <p className="text-sm text-charcoal">Could not load the upload form.</p>
          <Button type="button" variant="outline" onClick={handleRetry}>
            Try again
          </Button>
        </div>
      ) : moduleReady ? (
        <Suspense fallback={<Placeholder />}>
          <UploadSectionLazy />
        </Suspense>
      ) : (
        <Placeholder />
      )}
    </div>
  );
}
