import { AlertCircle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export interface UploadErrorProps {
  /** The error message to display */
  message: string;
  /** Callback when user clicks retry */
  onRetry: () => void;
  /** Whether a retry is currently in progress */
  retrying?: boolean;
  /** Whether the error is retryable (default: true) */
  retryable?: boolean;
}

/**
 * Display a friendly error message with retry option for upload failures.
 *
 * Uses warm, encouraging copy to reduce user frustration.
 */
export function UploadError({
  message,
  onRetry,
  retrying = false,
  retryable = true,
}: UploadErrorProps) {
  return (
    <div className="flex flex-col items-center gap-4 p-6 text-center">
      {/* Error icon with warm styling */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>

      {/* Error message */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">Oops! Something went wrong</h3>
        <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      </div>

      {/* Retry button */}
      {retryable && (
        <Button onClick={onRetry} disabled={retrying} className="min-w-[140px]" size="lg">
          {retrying ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Retrying...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </>
          )}
        </Button>
      )}

      {/* Encouragement message */}
      <p className="text-xs text-muted-foreground">
        Don't worry, your photo is safe. Just give it another go!
      </p>
    </div>
  );
}
