import { useCallback } from "react"
import { useNavigate } from "@tanstack/react-router"

import { UploadForm } from "@/components/upload/upload-form"
import type { UploadResult } from "@/hooks/use-upload"

export interface UploadSectionProps {
  /** Optional id for scroll targeting */
  id?: string
}

/**
 * Upload Section - Landing page upload form with navigation
 * 
 * Integrates the UploadForm component and navigates to /processing/{jobId}
 * after successful upload.
 */
export function UploadSection({ id }: UploadSectionProps) {
  const navigate = useNavigate()

  const handleUploadComplete = useCallback(
    (result: UploadResult & { email: string }) => {
      // Navigate to processing page with the job ID
      navigate({
        to: "/processing/$jobId",
        params: { jobId: result.uploadId },
      })
    },
    [navigate]
  )

  return (
    <section id={id} className="py-12">
      <div className="max-w-md mx-auto">
        <h2 className="font-display text-2xl text-charcoal text-center mb-6">
          Upload your ultrasound
        </h2>
        <UploadForm
          enableUpload
          onUploadComplete={handleUploadComplete}
        />
      </div>
    </section>
  )
}
