import { useCallback, useState } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"

import { UploadForm } from "@/components/upload/upload-form"
import type { UploadResult } from "@/hooks/use-upload"

export interface UploadSectionProps {
  /** Optional id for scroll targeting */
  id?: string
}

type PromptVersion = "v3" | "v3-json" | "v4" | "v4-json"

const PROMPT_OPTIONS: { value: PromptVersion; label: string }[] = [
  { value: "v4", label: "v4 - National Geographic Style" },
  { value: "v4-json", label: "v4-json - National Geographic (JSON)" },
  { value: "v3", label: "v3 - Close-up In-utero Style" },
  { value: "v3-json", label: "v3-json - Close-up (JSON)" },
]

/**
 * Upload Section - Landing page upload form with navigation
 * 
 * Integrates the UploadForm component and navigates to /processing/{jobId}
 * after successful upload.
 * 
 * Add ?prompts=true to URL to show prompt selector (for testing)
 */
export function UploadSection({ id }: UploadSectionProps) {
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as { prompts?: boolean }
  const showPromptSelector = search?.prompts === true
  
  const [selectedPrompt, setSelectedPrompt] = useState<PromptVersion>("v4")

  const handleUploadComplete = useCallback(
    (result: UploadResult & { email: string }) => {
      // Navigate to processing page with the job ID and optional prompt
      navigate({
        to: "/processing/$jobId",
        params: { jobId: result.uploadId },
        search: showPromptSelector ? { prompts: true, promptVersion: selectedPrompt } : undefined,
      })
    },
    [navigate, showPromptSelector, selectedPrompt]
  )

  return (
    <section id={id} className="py-12">
      <div className="max-w-md mx-auto">
        <h2 className="font-display text-2xl text-charcoal text-center mb-6">
          Upload your ultrasound
        </h2>
        
        {/* Prompt selector - only shown with ?prompts=true */}
        {showPromptSelector && (
          <div className="mb-6 p-4 bg-charcoal/5 rounded-lg">
            <p className="text-sm font-medium text-charcoal mb-3">
              Select Prompt Style (Testing Mode)
            </p>
            <div className="space-y-2">
              {PROMPT_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                    selectedPrompt === option.value
                      ? "border-coral bg-coral/10"
                      : "border-warm-gray/30 hover:border-coral/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="promptVersion"
                    value={option.value}
                    checked={selectedPrompt === option.value}
                    onChange={(e) => setSelectedPrompt(e.target.value as PromptVersion)}
                    className="sr-only"
                  />
                  <div
                    className={`size-4 rounded-full border-2 flex items-center justify-center ${
                      selectedPrompt === option.value
                        ? "border-coral"
                        : "border-warm-gray/50"
                    }`}
                  >
                    {selectedPrompt === option.value && (
                      <div className="size-2 rounded-full bg-coral" />
                    )}
                  </div>
                  <span className="text-sm text-charcoal">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
        
        <UploadForm
          enableUpload
          onUploadComplete={handleUploadComplete}
        />
      </div>
    </section>
  )
}
