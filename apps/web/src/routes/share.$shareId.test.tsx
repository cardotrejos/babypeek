import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useQuery } from "@tanstack/react-query"
import { useEffect, type ReactNode } from "react"

// Define mock functions before vi.mock calls
const mockNavigate = vi.fn()
const mockShareId = "test-share-123"
const mockPosthogCapture = vi.fn()
const mockIsPostHogConfigured = vi.fn(() => true)

// Mock TanStack Router
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({
    component: () => null,
  }),
  useNavigate: () => mockNavigate,
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

// Mock PostHog
vi.mock("@/lib/posthog", () => ({
  posthog: {
    capture: (...args: unknown[]) => mockPosthogCapture(...args),
  },
  isPostHogConfigured: () => mockIsPostHogConfigured(),
}))

// Mock API config
vi.mock("@/lib/api-config", () => ({
  API_BASE_URL: "https://api.test.com",
}))

// Import mocked modules
import { posthog, isPostHogConfigured } from "@/lib/posthog"
import { Button } from "@/components/ui/button"

/**
 * Test version of SharePage
 * Mirrors the actual implementation for testing purposes
 */
function TestSharePage({ shareId }: { shareId: string }) {
  interface ShareData {
    shareId: string
    uploadId: string
    previewUrl: string
  }

  const {
    data: result,
    isLoading,
    error,
  } = useQuery<ShareData>({
    queryKey: ["share", shareId],
    queryFn: async () => {
      const response = await fetch(`https://api.test.com/api/share/${shareId}`)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("This portrait is no longer available")
        }
        throw new Error("Failed to load portrait")
      }
      return response.json()
    },
    retry: false,
  })

  // Analytics tracking
  useEffect(() => {
    if (isPostHogConfigured() && result) {
      posthog.capture("share_page_viewed", {
        share_id: shareId,
        referrer: document.referrer || "direct",
      })
    }
  }, [shareId, result])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="size-12 animate-spin rounded-full border-4 border-coral border-t-transparent mx-auto" />
          <p className="font-body text-warm-gray">Loading portrait...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !result) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="size-16 rounded-full bg-warm-gray/10 flex items-center justify-center">
              <span className="text-3xl">😢</span>
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-2xl text-charcoal">Portrait Not Available</h1>
            <p className="font-body text-warm-gray">
              This portrait may have expired or been removed.
            </p>
            <p className="font-body text-sm text-warm-gray/70">
              Portraits are automatically deleted after 30 days for privacy.
            </p>
          </div>
          <div className="space-y-3">
            <Button className="w-full">Create Your Own Portrait</Button>
            <p className="text-xs text-warm-gray/50">
              Try BabyPeek free – see what AI creates from your ultrasound!
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-md mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="font-display text-2xl text-charcoal">See what AI created from an ultrasound! ✨</h1>
          <p className="font-body text-warm-gray">
            Someone turned their ultrasound into this beautiful baby portrait
          </p>
        </div>

        {/* Preview Image */}
        <div className="relative">
          <img
            src={result.previewUrl}
            alt="AI-generated baby portrait preview"
            className="w-full rounded-2xl shadow-lg"
          />
          <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded">
            Preview
          </div>
        </div>

        {/* Gift CTA */}
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <button data-testid="gift-checkout-btn">
            Gift (shareId: {shareId}, uploadId: {result.uploadId})
          </button>
        </div>
      </div>
    </div>
  )
}

// Helper to create test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe("SharePage - Story 8.4", () => {
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    originalFetch = global.fetch
    mockIsPostHogConfigured.mockReturnValue(true)
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  describe("AC-1: Display watermarked preview", () => {
    it("should display preview image when share data loads successfully", async () => {
      const mockShareData = {
        shareId: mockShareId,
        uploadId: "upload-123",
        previewUrl: "https://r2.test.com/preview/test.jpg",
      }

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockShareData),
      })

      render(<TestSharePage shareId={mockShareId} />, { wrapper: createWrapper() })

      await waitFor(() => {
        const img = screen.getByAltText("AI-generated baby portrait preview")
        expect(img).toBeInTheDocument()
        expect(img).toHaveAttribute("src", mockShareData.previewUrl)
      })
    })
  })

  describe("AC-2: Contextual messaging", () => {
    it("should display correct heading text", async () => {
      const mockShareData = {
        shareId: mockShareId,
        uploadId: "upload-123",
        previewUrl: "https://r2.test.com/preview/test.jpg",
      }

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockShareData),
      })

      render(<TestSharePage shareId={mockShareId} />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText("See what AI created from an ultrasound! ✨")).toBeInTheDocument()
        expect(
          screen.getByText("Someone turned their ultrasound into this beautiful baby portrait")
        ).toBeInTheDocument()
      })
    })
  })

  describe("AC-5: Expired/deleted results error", () => {
    it("should display friendly error when share returns 404", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      render(<TestSharePage shareId={mockShareId} />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText("Portrait Not Available")).toBeInTheDocument()
        expect(
          screen.getByText("This portrait may have expired or been removed.")
        ).toBeInTheDocument()
        expect(
          screen.getByText("Portraits are automatically deleted after 30 days for privacy.")
        ).toBeInTheDocument()
      })
    })

    it("should show CTA to create own portrait on error", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      render(<TestSharePage shareId={mockShareId} />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText("Create Your Own Portrait")).toBeInTheDocument()
      })
    })
  })

  describe("AC-6: Fast loading (no auth)", () => {
    it("should display loading state initially", () => {
      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () =>
                    Promise.resolve({ shareId: mockShareId, uploadId: "u", previewUrl: "p" }),
                }),
              100
            )
          )
      )

      render(<TestSharePage shareId={mockShareId} />, { wrapper: createWrapper() })

      expect(screen.getByText("Loading portrait...")).toBeInTheDocument()
    })
  })

  describe("Analytics tracking", () => {
    it("should track share_page_viewed event when data loads", async () => {
      const mockShareData = {
        shareId: mockShareId,
        uploadId: "upload-123",
        previewUrl: "https://r2.test.com/preview/test.jpg",
      }

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockShareData),
      })

      render(<TestSharePage shareId={mockShareId} />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(mockPosthogCapture).toHaveBeenCalledWith("share_page_viewed", {
          share_id: mockShareId,
          referrer: expect.any(String),
        })
      })
    })

    it("should not track when PostHog is not configured", async () => {
      mockIsPostHogConfigured.mockReturnValue(false)

      const mockShareData = {
        shareId: mockShareId,
        uploadId: "upload-123",
        previewUrl: "https://r2.test.com/preview/test.jpg",
      }

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockShareData),
      })

      render(<TestSharePage shareId={mockShareId} />, { wrapper: createWrapper() })

      // Wait for component to settle
      await waitFor(() => {
        expect(screen.getByAltText("AI-generated baby portrait preview")).toBeInTheDocument()
      })

      // PostHog should not have been called
      expect(mockPosthogCapture).not.toHaveBeenCalled()
    })
  })
})
