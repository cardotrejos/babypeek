import * as Sentry from "@sentry/react"
import type { ReactNode } from "react"

interface ErrorFallbackProps {
  error: Error
  resetError?: () => void
}

/**
 * Fallback UI shown when an error is caught
 */
function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
      <div className="mb-6 text-6xl">😔</div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        Something went wrong
      </h1>
      <p className="mb-6 max-w-md text-gray-600">
        We've been notified and are working on it. Please try again in a moment.
      </p>
      {resetError && (
        <button
          onClick={resetError}
          className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
        >
          Try Again
        </button>
      )}
      {import.meta.env.DEV && (
        <details className="mt-8 max-w-lg text-left">
          <summary className="cursor-pointer text-sm text-gray-500">
            Error Details (dev only)
          </summary>
          <pre className="mt-2 overflow-auto rounded bg-gray-100 p-4 text-xs text-red-600">
            {error.message}
            {"\n\n"}
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  )
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Error boundary that catches React errors and reports to Sentry
 * 
 * @example
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 */
export function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) =>
        fallback || <ErrorFallback error={error} resetError={resetError} />
      }
      onError={(error, componentStack) => {
        // Log to console in development
        if (import.meta.env.DEV) {
          console.error("Error caught by boundary:", error)
          console.error("Component stack:", componentStack)
        }
      }}
    >
      {children}
    </Sentry.ErrorBoundary>
  )
}

/**
 * HOC to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}
