import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ShareButtons } from "./ShareButtons"

// Mock PostHog
vi.mock("@/lib/posthog", () => ({
  posthog: {
    capture: vi.fn(),
  },
  isPostHogConfigured: vi.fn(() => true),
}))

// Mock Sentry
vi.mock("@/lib/sentry", () => ({
  addBreadcrumb: vi.fn(),
}))

// Mock device detection - start with desktop
const mockIsIOS = vi.fn(() => false)
const mockIsAndroid = vi.fn(() => false)
const mockIsMobile = vi.fn(() => false)
const mockGetDeviceType = vi.fn((): "desktop" | "ios" | "android" => "desktop")

vi.mock("@/lib/device-detection", () => ({
  isIOS: () => mockIsIOS(),
  isAndroid: () => mockIsAndroid(),
  isMobile: () => mockIsMobile(),
  getDeviceType: () => mockGetDeviceType(),
}))

// Import mocks after mock definitions
import { posthog } from "@/lib/posthog"
import { addBreadcrumb } from "@/lib/sentry"

describe("ShareButtons", () => {
  const defaultProps = {
    uploadId: "test-upload-123",
    resultId: "test-result-456",
  }

  // Mock window.open
  let mockOpen: ReturnType<typeof vi.fn>
  let locationHref: string

  beforeEach(() => {
    vi.clearAllMocks()
    locationHref = ""

    // Reset device detection mocks to desktop
    mockIsIOS.mockReturnValue(false)
    mockIsAndroid.mockReturnValue(false)
    mockIsMobile.mockReturnValue(false)
    mockGetDeviceType.mockReturnValue("desktop")

    // Mock window.open
    mockOpen = vi.fn()
    global.open = mockOpen

    // Mock location href setter
    Object.defineProperty(window, "location", {
      value: {
        ...window.location,
        get href() {
          return locationHref
        },
        set href(val: string) {
          locationHref = val
        },
      },
      configurable: true,
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("WhatsApp Button (Story 8.1)", () => {
    it("should render WhatsApp button", () => {
      render(<ShareButtons {...defaultProps} />)

      expect(screen.getByTestId("share-whatsapp")).toBeInTheDocument()
      expect(screen.getByText("WhatsApp")).toBeInTheDocument()
    })

    it("should have WhatsApp brand green color", () => {
      render(<ShareButtons {...defaultProps} />)

      const button = screen.getByTestId("share-whatsapp")
      expect(button).toHaveClass("bg-[#25D366]")
    })

    it("should open WhatsApp with encoded message on click", () => {
      render(<ShareButtons {...defaultProps} />)

      const button = screen.getByTestId("share-whatsapp")
      fireEvent.click(button)

      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining("https://wa.me/?text="),
        "_blank",
        "noopener,noreferrer"
      )
      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining(
          encodeURIComponent("https://3d-ultra.com/share/test-upload-123")
        ),
        "_blank",
        "noopener,noreferrer"
      )
    })

    it("should track share_clicked event with platform=whatsapp", () => {
      render(<ShareButtons {...defaultProps} />)

      const button = screen.getByTestId("share-whatsapp")
      fireEvent.click(button)

      expect(posthog.capture).toHaveBeenCalledWith("share_clicked", {
        result_id: "test-result-456",
        upload_id: "test-upload-123",
        platform: "whatsapp",
        device_type: "desktop",
      })
    })

    it("should add Sentry breadcrumb on click", () => {
      render(<ShareButtons {...defaultProps} />)

      const button = screen.getByTestId("share-whatsapp")
      fireEvent.click(button)

      expect(addBreadcrumb).toHaveBeenCalledWith("Share clicked", "user", {
        platform: "whatsapp",
      })
    })
  })

  describe("iMessage/SMS Button (Story 8.2)", () => {
    describe("on desktop", () => {
      it("should NOT render iMessage button on desktop (AC-5)", () => {
        render(<ShareButtons {...defaultProps} />)

        expect(screen.queryByTestId("share-imessage")).not.toBeInTheDocument()
      })
    })

    describe("on iOS", () => {
      beforeEach(() => {
        mockIsIOS.mockReturnValue(true)
        mockIsAndroid.mockReturnValue(false)
        mockIsMobile.mockReturnValue(true)
        mockGetDeviceType.mockReturnValue("ios")
      })

      it("should render iMessage button on iOS (AC-1)", () => {
        render(<ShareButtons {...defaultProps} />)

        expect(screen.getByTestId("share-imessage")).toBeInTheDocument()
        expect(screen.getByText("iMessage")).toBeInTheDocument()
      })

      it("should have iOS blue color #007AFF (AC-4)", () => {
        render(<ShareButtons {...defaultProps} />)

        const button = screen.getByTestId("share-imessage")
        expect(button).toHaveClass("bg-[#007AFF]")
      })

      it("should have correct aria-label for iOS", () => {
        render(<ShareButtons {...defaultProps} />)

        const button = screen.getByTestId("share-imessage")
        expect(button).toHaveAttribute("aria-label", "Share via iMessage")
      })

      it("should use iOS SMS URL format sms:&body= (AC-1, AC-2)", () => {
        render(<ShareButtons {...defaultProps} />)

        const button = screen.getByTestId("share-imessage")
        fireEvent.click(button)

        // iOS uses &body= (ampersand)
        expect(locationHref).toContain("sms:&body=")
        expect(locationHref).toContain(
          encodeURIComponent("https://3d-ultra.com/share/test-upload-123")
        )
      })

      it("should track share_clicked with platform=imessage on iOS (AC-3)", () => {
        render(<ShareButtons {...defaultProps} />)

        const button = screen.getByTestId("share-imessage")
        fireEvent.click(button)

        expect(posthog.capture).toHaveBeenCalledWith("share_clicked", {
          result_id: "test-result-456",
          upload_id: "test-upload-123",
          platform: "imessage",
          device_type: "ios",
        })
      })

      it("should add Sentry breadcrumb with platform=imessage", () => {
        render(<ShareButtons {...defaultProps} />)

        const button = screen.getByTestId("share-imessage")
        fireEvent.click(button)

        expect(addBreadcrumb).toHaveBeenCalledWith("Share clicked", "user", {
          platform: "imessage",
        })
      })
    })

    describe("on Android", () => {
      beforeEach(() => {
        mockIsIOS.mockReturnValue(false)
        mockIsAndroid.mockReturnValue(true)
        mockIsMobile.mockReturnValue(true)
        mockGetDeviceType.mockReturnValue("android")
      })

      it("should render Message button on Android (AC-5 fallback)", () => {
        render(<ShareButtons {...defaultProps} />)

        expect(screen.getByTestId("share-imessage")).toBeInTheDocument()
        expect(screen.getByText("Message")).toBeInTheDocument()
      })

      it("should have correct aria-label for Android", () => {
        render(<ShareButtons {...defaultProps} />)

        const button = screen.getByTestId("share-imessage")
        expect(button).toHaveAttribute("aria-label", "Share via SMS")
      })

      it("should use Android SMS URL format sms:?body=", () => {
        render(<ShareButtons {...defaultProps} />)

        const button = screen.getByTestId("share-imessage")
        fireEvent.click(button)

        // Android uses ?body= (question mark)
        expect(locationHref).toContain("sms:?body=")
        expect(locationHref).toContain(
          encodeURIComponent("https://3d-ultra.com/share/test-upload-123")
        )
      })

      it("should track share_clicked with platform=sms on Android (AC-3)", () => {
        render(<ShareButtons {...defaultProps} />)

        const button = screen.getByTestId("share-imessage")
        fireEvent.click(button)

        expect(posthog.capture).toHaveBeenCalledWith("share_clicked", {
          result_id: "test-result-456",
          upload_id: "test-upload-123",
          platform: "sms",
          device_type: "android",
        })
      })
    })
  })

  describe("Share URL (AC-2)", () => {
    it("should include correct share URL with uploadId in message", () => {
      render(<ShareButtons {...defaultProps} />)

      const button = screen.getByTestId("share-whatsapp")
      fireEvent.click(button)

      const expectedUrl = "https://3d-ultra.com/share/test-upload-123"
      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent(expectedUrl)),
        expect.any(String),
        expect.any(String)
      )
    })
  })

  describe("Accessibility", () => {
    it("should have min-height of 48px for touch targets", () => {
      render(<ShareButtons {...defaultProps} />)

      const button = screen.getByTestId("share-whatsapp")
      expect(button).toHaveClass("min-h-[48px]")
    })

    it("should have proper aria-label on WhatsApp button", () => {
      render(<ShareButtons {...defaultProps} />)

      const button = screen.getByTestId("share-whatsapp")
      expect(button).toHaveAttribute("aria-label", "Share to WhatsApp")
    })
  })

  describe("Copy Link Button (Story 8.3)", () => {
    it("should render Copy Link button on all devices (AC-5)", () => {
      render(<ShareButtons {...defaultProps} />)

      expect(screen.getByTestId("share-copy-link")).toBeInTheDocument()
      expect(screen.getByText("Copy Link")).toBeInTheDocument()
    })

    it("should have proper aria-label", () => {
      render(<ShareButtons {...defaultProps} />)

      const button = screen.getByTestId("share-copy-link")
      expect(button).toHaveAttribute("aria-label", "Copy share link")
    })

    it("should have min-height of 48px for touch targets", () => {
      render(<ShareButtons {...defaultProps} />)

      const button = screen.getByTestId("share-copy-link")
      expect(button).toHaveClass("min-h-[48px]")
    })

    describe("when clipboard API is available", () => {
      beforeEach(() => {
        // Mock clipboard API
        Object.assign(navigator, {
          clipboard: {
            writeText: vi.fn().mockResolvedValue(undefined),
          },
        })
        // Mock secure context
        Object.defineProperty(window, "isSecureContext", {
          value: true,
          configurable: true,
        })
      })

      it("should copy share URL to clipboard (AC-1)", async () => {
        render(<ShareButtons {...defaultProps} />)

        const button = screen.getByTestId("share-copy-link")
        fireEvent.click(button)

        await vi.waitFor(() => {
          expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
            "https://3d-ultra.com/share/test-upload-123"
          )
        })
      })

      it("should track share_clicked with platform=copy (AC-4)", async () => {
        render(<ShareButtons {...defaultProps} />)

        const button = screen.getByTestId("share-copy-link")
        fireEvent.click(button)

        await vi.waitFor(() => {
          expect(posthog.capture).toHaveBeenCalledWith("share_clicked", {
            result_id: "test-result-456",
            upload_id: "test-upload-123",
            platform: "copy",
            copy_success: true,
            device_type: "desktop",
          })
        })
      })

      it("should add Sentry breadcrumb on copy", async () => {
        render(<ShareButtons {...defaultProps} />)

        const button = screen.getByTestId("share-copy-link")
        fireEvent.click(button)

        await vi.waitFor(() => {
          expect(addBreadcrumb).toHaveBeenCalledWith("Share clicked", "user", {
            platform: "copy",
            success: true,
          })
        })
      })
    })

    describe("when clipboard API fails", () => {
      beforeEach(() => {
        Object.assign(navigator, {
          clipboard: {
            writeText: vi.fn().mockRejectedValue(new Error("Clipboard error")),
          },
        })
        Object.defineProperty(window, "isSecureContext", {
          value: true,
          configurable: true,
        })
      })

      it("should track copy_success as false on failure (AC-4)", async () => {
        render(<ShareButtons {...defaultProps} />)

        const button = screen.getByTestId("share-copy-link")
        fireEvent.click(button)

        await vi.waitFor(() => {
          expect(posthog.capture).toHaveBeenCalledWith("share_clicked", {
            result_id: "test-result-456",
            upload_id: "test-upload-123",
            platform: "copy",
            copy_success: false,
            device_type: "desktop",
          })
        })
      })
    })
  })
})
