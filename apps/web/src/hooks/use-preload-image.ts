import { useState, useEffect } from "react";

interface UsePreloadImageResult {
  isLoaded: boolean;
  isLoading: boolean;
  error: Error | null;
}

/**
 * usePreloadImage Hook
 * Story 5.3: Image Preloading (AC-6)
 *
 * Preloads an image into the browser cache using the native Image constructor.
 * Use this to start loading the preview URL when processing reaches 80%+
 * to ensure the reveal animation doesn't wait for image loading.
 *
 * @param url - The image URL to preload (null to skip)
 * @returns Object with isLoaded, isLoading, and error states
 */
export function usePreloadImage(url: string | null): UsePreloadImageResult {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Reset state when URL changes or becomes null
    if (!url) {
      setIsLoaded(false);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Start loading
    setIsLoading(true);
    setIsLoaded(false);
    setError(null);

    const img = new Image();

    const handleLoad = () => {
      setIsLoaded(true);
      setIsLoading(false);
    };

    const handleError = () => {
      setError(new Error("Failed to preload image"));
      setIsLoading(false);
    };

    img.onload = handleLoad;
    img.onerror = handleError;
    img.src = url;

    // Cleanup on unmount or URL change
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [url]);

  return { isLoaded, isLoading, error };
}
