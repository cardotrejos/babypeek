/**
 * Test utilities for React component testing
 */
import { render, type RenderOptions } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactElement, ReactNode } from "react"

/**
 * Create a fresh QueryClient for tests
 * Disables retries and caching for predictable test behavior
 */
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

interface WrapperProps {
  children: ReactNode
}

/**
 * Wrapper component with all providers needed for testing
 */
function TestProviders({ children }: WrapperProps) {
  const queryClient = createTestQueryClient()

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

/**
 * Custom render function that wraps components with test providers
 * @example
 * ```tsx
 * import { render, screen } from '@/test/test-utils'
 *
 * test('renders component', () => {
 *   render(<MyComponent />)
 *   expect(screen.getByText('Hello')).toBeInTheDocument()
 * })
 * ```
 */
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  return render(ui, { wrapper: TestProviders, ...options })
}

// Re-export everything from testing-library
export * from "@testing-library/react"
export { default as userEvent } from "@testing-library/user-event"

// Override render with our custom version
export { customRender as render }

// =============================================================================
// File Creation Utilities
// =============================================================================

/**
 * Create a mock file with the given properties
 * Uses ArrayBuffer for better performance with large files
 * 
 * @param name - File name
 * @param type - MIME type
 * @param sizeInMB - Size in megabytes (default: 1)
 * @returns Mock File object
 * 
 * @example
 * ```ts
 * const file = createMockFile("photo.jpg", "image/jpeg", 5)
 * ```
 */
export function createMockFile(
  name: string,
  type: string,
  sizeInMB: number = 1
): File {
  const size = Math.floor(sizeInMB * 1024 * 1024)
  const buffer = new ArrayBuffer(size)
  return new File([buffer], name, { type })
}

/**
 * Create a mock HEIC file for testing
 * 
 * @param sizeInMB - Size in megabytes (default: 1)
 * @returns Mock HEIC File object
 */
export function createMockHeicFile(sizeInMB: number = 1): File {
  return createMockFile("test.heic", "image/heic", sizeInMB)
}

/**
 * Create a mock JPEG file for testing
 * 
 * @param sizeInMB - Size in megabytes (default: 1)
 * @returns Mock JPEG File object
 */
export function createMockJpegFile(sizeInMB: number = 1): File {
  return createMockFile("test.jpg", "image/jpeg", sizeInMB)
}

/**
 * Create a mock PNG file for testing
 * 
 * @param sizeInMB - Size in megabytes (default: 1)
 * @returns Mock PNG File object
 */
export function createMockPngFile(sizeInMB: number = 1): File {
  return createMockFile("test.png", "image/png", sizeInMB)
}

/**
 * Create a DataTransfer object for drag-drop testing
 * 
 * @param files - Array of files to include
 * @returns Mock DataTransfer object
 */
export function createDataTransfer(files: File[]): DataTransfer {
  return {
    files,
    items: files.map((file) => ({
      kind: "file",
      type: file.type,
      getAsFile: () => file,
    })),
    types: ["Files"],
  } as unknown as DataTransfer
}
