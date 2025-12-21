import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { toast } from "sonner"

import { ImageUploader } from "./image-uploader"

// =============================================================================
// Mocks
// =============================================================================

// Mock heic2any - returns JPEG blob for HEIC conversion
vi.mock("heic2any", () => ({
  default: vi.fn().mockImplementation(async () => {
    // Return a mock JPEG blob
    return new Blob(["mock jpeg content"], { type: "image/jpeg" })
  }),
}))

// =============================================================================
// Test Helpers
// =============================================================================

function createMockFile(
  name: string,
  size: number,
  type: string
): File {
  // Use Blob with ArrayBuffer for efficient large file creation
  // This avoids creating massive strings for 25MB+ test files
  const buffer = new ArrayBuffer(size)
  const blob = new Blob([buffer], { type })
  return new File([blob], name, { type })
}

function createDataTransfer(files: File[]): DataTransfer {
  const dataTransfer = {
    files,
    items: files.map((file) => ({
      kind: "file",
      type: file.type,
      getAsFile: () => file,
    })),
    types: ["Files"],
  } as unknown as DataTransfer
  return dataTransfer
}

// =============================================================================
// Tests
// =============================================================================

describe("ImageUploader", () => {
  const mockOnFileSelect = vi.fn()
  const mockOnFileClear = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Rendering", () => {
    it("renders upload zone with instructions", () => {
      render(<ImageUploader onFileSelect={mockOnFileSelect} />)

      expect(screen.getByText("Tap to upload your ultrasound")).toBeInTheDocument()
      expect(screen.getByText("JPEG, PNG, or HEIC up to 25MB")).toBeInTheDocument()
    })

    it("has correct aria-label for accessibility", () => {
      render(<ImageUploader onFileSelect={mockOnFileSelect} />)

      const uploadZone = screen.getByRole("button", {
        name: "Upload your 4D ultrasound image",
      })
      expect(uploadZone).toBeInTheDocument()
    })

    it("has minimum 48px touch target", () => {
      render(<ImageUploader onFileSelect={mockOnFileSelect} />)

      const uploadZone = screen.getByRole("button", {
        name: "Upload your 4D ultrasound image",
      })
      expect(uploadZone).toHaveClass("touch-target")
    })
  })

  describe("File Type Validation (AC-1, AC-3)", () => {
    it("accepts JPEG files", async () => {
      render(<ImageUploader onFileSelect={mockOnFileSelect} />)

      const file = createMockFile("test.jpg", 1024, "image/jpeg")
      const input = document.querySelector('input[type="file"]') as HTMLInputElement

      await userEvent.upload(input, file)

      expect(mockOnFileSelect).toHaveBeenCalledWith(file)
      expect(toast.error).not.toHaveBeenCalled()
    })

    it("accepts PNG files", async () => {
      render(<ImageUploader onFileSelect={mockOnFileSelect} />)

      const file = createMockFile("test.png", 1024, "image/png")
      const input = document.querySelector('input[type="file"]') as HTMLInputElement

      await userEvent.upload(input, file)

      expect(mockOnFileSelect).toHaveBeenCalledWith(file)
      expect(toast.error).not.toHaveBeenCalled()
    })

    it("accepts HEIC files and converts them to JPEG", async () => {
      render(<ImageUploader onFileSelect={mockOnFileSelect} />)

      const file = createMockFile("test.heic", 1024, "image/heic")
      const input = document.querySelector('input[type="file"]') as HTMLInputElement

      await userEvent.upload(input, file)

      // Wait for async processing to complete
      await waitFor(() => {
        expect(mockOnFileSelect).toHaveBeenCalled()
      })
      
      // HEIC files are converted to JPEG, so the callback receives a JPEG file
      const calledWithFile = mockOnFileSelect.mock.calls[0][0] as File
      expect(calledWithFile.type).toBe("image/jpeg")
      expect(calledWithFile.name).toBe("test.jpg")
      expect(toast.error).not.toHaveBeenCalled()
    })

    it("accepts HEIC files with extension even if MIME type is wrong", async () => {
      render(<ImageUploader onFileSelect={mockOnFileSelect} />)

      // Some devices report HEIC with wrong MIME type
      const file = createMockFile("test.heic", 1024, "application/octet-stream")
      const input = document.querySelector('input[type="file"]') as HTMLInputElement

      await userEvent.upload(input, file)

      // Wait for async processing to complete
      await waitFor(() => {
        expect(mockOnFileSelect).toHaveBeenCalled()
      })
      
      // File is converted to JPEG
      const calledWithFile = mockOnFileSelect.mock.calls[0][0] as File
      expect(calledWithFile.type).toBe("image/jpeg")
      expect(toast.error).not.toHaveBeenCalled()
    })

    it("rejects non-image files with warm error message", async () => {
      render(<ImageUploader onFileSelect={mockOnFileSelect} />)

      const file = createMockFile("test.pdf", 1024, "application/pdf")
      const input = document.querySelector('input[type="file"]') as HTMLInputElement

      // userEvent.upload respects the accept attribute, so we need to use fireEvent
      // to simulate a file that wouldn't normally be allowed
      fireEvent.change(input, { target: { files: [file] } })

      expect(mockOnFileSelect).not.toHaveBeenCalled()
      expect(toast.error).toHaveBeenCalledWith(
        "Please select a photo (JPEG, PNG, or HEIC)",
        expect.any(Object)
      )
    })

    it("rejects unsupported image formats", async () => {
      render(<ImageUploader onFileSelect={mockOnFileSelect} />)

      const file = createMockFile("test.gif", 1024, "image/gif")
      const input = document.querySelector('input[type="file"]') as HTMLInputElement

      // userEvent.upload respects the accept attribute, so we need to use fireEvent
      fireEvent.change(input, { target: { files: [file] } })

      expect(mockOnFileSelect).not.toHaveBeenCalled()
      expect(toast.error).toHaveBeenCalledWith(
        "Please select a photo (JPEG, PNG, or HEIC)",
        expect.any(Object)
      )
    })
  })

  describe("File Size Validation (AC-2)", () => {
    it("accepts files under 25MB", async () => {
      render(<ImageUploader onFileSelect={mockOnFileSelect} />)

      const size = 24 * 1024 * 1024 // 24MB
      const file = createMockFile("test.jpg", size, "image/jpeg")
      const input = document.querySelector('input[type="file"]') as HTMLInputElement

      await userEvent.upload(input, file)

      expect(mockOnFileSelect).toHaveBeenCalledWith(file)
      expect(toast.error).not.toHaveBeenCalled()
    })

    it("rejects files over 25MB with warm error including file size", async () => {
      render(<ImageUploader onFileSelect={mockOnFileSelect} />)

      const size = 32 * 1024 * 1024 // 32MB
      const file = createMockFile("test.jpg", size, "image/jpeg")
      const input = document.querySelector('input[type="file"]') as HTMLInputElement

      await userEvent.upload(input, file)

      expect(mockOnFileSelect).not.toHaveBeenCalled()
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("This image is too large"),
        expect.any(Object)
      )
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("32.0MB"),
        expect.any(Object)
      )
    })
  })

  describe("Drag and Drop (AC-4, AC-5)", () => {
    it("shows pulse animation on drag over", async () => {
      render(<ImageUploader onFileSelect={mockOnFileSelect} />)

      const uploadZone = screen.getByRole("button", {
        name: "Upload your 4D ultrasound image",
      })

      fireEvent.dragEnter(uploadZone)
      fireEvent.dragOver(uploadZone)

      expect(uploadZone).toHaveClass("animate-pulse")
    })

    it("removes pulse animation on drag leave", async () => {
      render(<ImageUploader onFileSelect={mockOnFileSelect} />)

      const uploadZone = screen.getByRole("button", {
        name: "Upload your 4D ultrasound image",
      })

      fireEvent.dragEnter(uploadZone)
      fireEvent.dragOver(uploadZone)
      fireEvent.dragLeave(uploadZone)

      await waitFor(() => {
        expect(uploadZone).not.toHaveClass("animate-pulse")
      })
    })

    it("handles file drop", async () => {
      render(<ImageUploader onFileSelect={mockOnFileSelect} />)

      const file = createMockFile("test.jpg", 1024, "image/jpeg")
      const uploadZone = screen.getByRole("button", {
        name: "Upload your 4D ultrasound image",
      })

      fireEvent.drop(uploadZone, {
        dataTransfer: createDataTransfer([file]),
      })

      // Wait for async processing to complete
      await waitFor(() => {
        expect(mockOnFileSelect).toHaveBeenCalledWith(file)
      })
    })

    it("shows drop message when dragging", () => {
      render(<ImageUploader onFileSelect={mockOnFileSelect} />)

      const uploadZone = screen.getByRole("button", {
        name: "Upload your 4D ultrasound image",
      })

      fireEvent.dragEnter(uploadZone)
      fireEvent.dragOver(uploadZone)

      expect(screen.getByText("Drop your image here")).toBeInTheDocument()
    })
  })

  describe("Preview State (AC-1)", () => {
    it("shows preview after valid file selection", async () => {
      render(<ImageUploader onFileSelect={mockOnFileSelect} />)

      const file = createMockFile("test.jpg", 1024, "image/jpeg")
      const input = document.querySelector('input[type="file"]') as HTMLInputElement

      await userEvent.upload(input, file)

      await waitFor(() => {
        expect(screen.getByAltText("Selected ultrasound image preview")).toBeInTheDocument()
      })
      expect(screen.getByText("test.jpg")).toBeInTheDocument()
    })

    it("allows changing image after selection", async () => {
      render(<ImageUploader onFileSelect={mockOnFileSelect} />)

      const file1 = createMockFile("test1.jpg", 1024, "image/jpeg")
      const file2 = createMockFile("test2.jpg", 1024, "image/jpeg")
      const input = document.querySelector('input[type="file"]') as HTMLInputElement

      await userEvent.upload(input, file1)
      await userEvent.upload(input, file2)

      expect(mockOnFileSelect).toHaveBeenCalledTimes(2)
      expect(screen.getByText("test2.jpg")).toBeInTheDocument()
    })

    it("clears preview when remove button is clicked", async () => {
      render(
        <ImageUploader
          onFileSelect={mockOnFileSelect}
          onFileClear={mockOnFileClear}
        />
      )

      const file = createMockFile("test.jpg", 1024, "image/jpeg")
      const input = document.querySelector('input[type="file"]') as HTMLInputElement

      await userEvent.upload(input, file)

      const removeButton = screen.getByRole("button", { name: "Remove selected image" })
      await userEvent.click(removeButton)

      expect(mockOnFileClear).toHaveBeenCalled()
      expect(screen.getByText("Tap to upload your ultrasound")).toBeInTheDocument()
    })
  })

  describe("Keyboard Accessibility", () => {
    it("can be focused with tab", async () => {
      render(<ImageUploader onFileSelect={mockOnFileSelect} />)

      const uploadZone = screen.getByRole("button", {
        name: "Upload your 4D ultrasound image",
      })

      // The hidden input may receive focus first on tab, then the upload zone
      // We verify the upload zone is focusable by checking tabIndex
      expect(uploadZone).toHaveAttribute("tabindex", "0")
      
      // Focus the upload zone directly and verify it's focusable
      uploadZone.focus()
      expect(uploadZone).toHaveFocus()
    })

    it("triggers file input on Enter key", async () => {
      render(<ImageUploader onFileSelect={mockOnFileSelect} />)

      const uploadZone = screen.getByRole("button", {
        name: "Upload your 4D ultrasound image",
      })

      uploadZone.focus()

      // Mock the click on the hidden input
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const clickSpy = vi.spyOn(input, "click")

      fireEvent.keyDown(uploadZone, { key: "Enter" })

      expect(clickSpy).toHaveBeenCalled()
    })

    it("triggers file input on Space key", async () => {
      render(<ImageUploader onFileSelect={mockOnFileSelect} />)

      const uploadZone = screen.getByRole("button", {
        name: "Upload your 4D ultrasound image",
      })

      uploadZone.focus()

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const clickSpy = vi.spyOn(input, "click")

      fireEvent.keyDown(uploadZone, { key: " " })

      expect(clickSpy).toHaveBeenCalled()
    })
  })

  describe("Disabled State", () => {
    it("prevents interaction when disabled", async () => {
      render(<ImageUploader onFileSelect={mockOnFileSelect} disabled />)

      const uploadZone = screen.getByRole("button", {
        name: "Upload your 4D ultrasound image",
      })

      expect(uploadZone).toHaveClass("cursor-not-allowed", "opacity-50")
    })

    it("does not accept drops when disabled", async () => {
      render(<ImageUploader onFileSelect={mockOnFileSelect} disabled />)

      const file = createMockFile("test.jpg", 1024, "image/jpeg")
      const uploadZone = screen.getByRole("button", {
        name: "Upload your 4D ultrasound image",
      })

      fireEvent.drop(uploadZone, {
        dataTransfer: createDataTransfer([file]),
      })

      expect(mockOnFileSelect).not.toHaveBeenCalled()
    })
  })

  describe("Screen Reader Support", () => {
    it("announces file selection status", async () => {
      render(<ImageUploader onFileSelect={mockOnFileSelect} />)

      const file = createMockFile("test.jpg", 1024, "image/jpeg")
      const input = document.querySelector('input[type="file"]') as HTMLInputElement

      await userEvent.upload(input, file)

      const statusElement = screen.getByRole("status")
      expect(statusElement).toHaveTextContent("Image selected: test.jpg")
    })

    it("announces initial state for screen readers", () => {
      render(<ImageUploader onFileSelect={mockOnFileSelect} />)

      const statusElement = screen.getByRole("status")
      expect(statusElement).toHaveTextContent(
        "No image selected. Tap to upload your 4D ultrasound image."
      )
    })
  })

  describe("HEIC Processing Integration", () => {
    it("shows processing indicator during HEIC conversion", async () => {
      render(<ImageUploader onFileSelect={mockOnFileSelect} />)

      const file = createMockFile("test.heic", 1024, "image/heic")
      const input = document.querySelector('input[type="file"]') as HTMLInputElement

      // Start upload but don't wait for it to complete
      userEvent.upload(input, file)

      // Processing indicator should appear during conversion
      await waitFor(() => {
        expect(screen.getByText("Preparing image...")).toBeInTheDocument()
      })

      // Wait for processing to complete
      await waitFor(() => {
        expect(mockOnFileSelect).toHaveBeenCalled()
      })
    })

    it("converts HEIC file and passes JPEG to onFileSelect", async () => {
      render(<ImageUploader onFileSelect={mockOnFileSelect} />)

      const file = createMockFile("photo.heic", 1024, "image/heic")
      const input = document.querySelector('input[type="file"]') as HTMLInputElement

      await userEvent.upload(input, file)

      await waitFor(() => {
        expect(mockOnFileSelect).toHaveBeenCalled()
      })

      const calledWithFile = mockOnFileSelect.mock.calls[0][0] as File
      expect(calledWithFile.type).toBe("image/jpeg")
      expect(calledWithFile.name).toBe("photo.jpg")
    })

    it("calls onProcessingStart and onProcessingEnd callbacks", async () => {
      const mockOnProcessingStart = vi.fn()
      const mockOnProcessingEnd = vi.fn()

      render(
        <ImageUploader
          onFileSelect={mockOnFileSelect}
          onProcessingStart={mockOnProcessingStart}
          onProcessingEnd={mockOnProcessingEnd}
        />
      )

      const file = createMockFile("test.heic", 1024, "image/heic")
      const input = document.querySelector('input[type="file"]') as HTMLInputElement

      await userEvent.upload(input, file)

      await waitFor(() => {
        expect(mockOnProcessingStart).toHaveBeenCalled()
        expect(mockOnProcessingEnd).toHaveBeenCalled()
      })
    })

    it("disables upload zone during processing", async () => {
      render(<ImageUploader onFileSelect={mockOnFileSelect} />)

      const file = createMockFile("test.heic", 1024, "image/heic")
      const input = document.querySelector('input[type="file"]') as HTMLInputElement

      // Start upload
      userEvent.upload(input, file)

      // Zone should be disabled during processing
      await waitFor(() => {
        const uploadZone = screen.getByRole("button", {
          name: "Upload your 4D ultrasound image",
        })
        expect(uploadZone).toHaveClass("opacity-50")
      })

      // Wait for completion
      await waitFor(() => {
        expect(mockOnFileSelect).toHaveBeenCalled()
      })
    })
  })
})
