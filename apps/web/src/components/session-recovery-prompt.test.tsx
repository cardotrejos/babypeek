import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// Mock hook
const useSessionRecoveryMock = vi.fn()
vi.mock("@/hooks/use-session-recovery", () => ({
  useSessionRecovery: () => useSessionRecoveryMock(),
}))

import { SessionRecoveryPrompt } from "./session-recovery-prompt"

describe("SessionRecoveryPrompt", () => {
  beforeEach(() => {
    useSessionRecoveryMock.mockReset()
  })

  it("renders nothing when prompt is hidden", () => {
    useSessionRecoveryMock.mockReturnValue({
      pendingJob: null,
      showRecoveryPrompt: false,
      isChecking: false,
      resumeJob: vi.fn(),
      startFresh: vi.fn(),
      dismissPrompt: vi.fn(),
    })

    const { container } = render(<SessionRecoveryPrompt />)
    expect(container).toBeEmptyDOMElement()
  })

  it("renders pending job prompt with Continue button", async () => {
    const resumeJob = vi.fn()
    const startFresh = vi.fn()
    const dismissPrompt = vi.fn()

    useSessionRecoveryMock.mockReturnValue({
      pendingJob: { jobId: "job-1", token: "t", createdAt: Date.now(), status: "pending" },
      showRecoveryPrompt: true,
      isChecking: false,
      resumeJob,
      startFresh,
      dismissPrompt,
    })

    render(<SessionRecoveryPrompt />)

    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeInTheDocument()

    expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /start fresh/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /remind me later/i })).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: /continue/i }))
    expect(resumeJob).toHaveBeenCalledTimes(1)
  })

  it("renders processing job prompt with Check Progress button", async () => {
    const resumeJob = vi.fn()
    const startFresh = vi.fn()
    const dismissPrompt = vi.fn()

    useSessionRecoveryMock.mockReturnValue({
      pendingJob: { jobId: "job-2", token: "t", createdAt: Date.now(), status: "processing" },
      showRecoveryPrompt: true,
      isChecking: false,
      resumeJob,
      startFresh,
      dismissPrompt,
    })

    render(<SessionRecoveryPrompt />)

    expect(screen.getByRole("button", { name: /check progress/i })).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: /start fresh/i }))
    expect(startFresh).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole("button", { name: /remind me later/i }))
    expect(dismissPrompt).toHaveBeenCalledTimes(1)
  })
})

