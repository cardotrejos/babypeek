import { useCallback } from "react"
import { toast } from "sonner"
import { posthog, isPostHogConfigured } from "@/lib/posthog"
import { addBreadcrumb } from "@/lib/sentry"
import { isIOS, isMobile, getDeviceType } from "@/lib/device-detection"

interface ShareButtonsProps {
  uploadId: string
  resultId: string
}

/**
 * ShareButtons Component
 * Story 8.1: WhatsApp Share Button
 * Story 8.2: iMessage Share Button
 * Story 8.3: Copy Link Button
 *
 * Provides share buttons for social platforms.
 * - WhatsApp: Available on all platforms
 * - iMessage/SMS: Only on mobile devices (iOS shows iMessage, Android shows Message)
 * - Copy Link: Available on all platforms with clipboard fallback
 */
export function ShareButtons({ uploadId, resultId }: ShareButtonsProps) {
  const shareUrl = `https://3d-ultra.com/share/${uploadId}`
  const shareMessage = `Look at this AI baby portrait I created! 👶✨ ${shareUrl}`

  // Story 8.1: WhatsApp share handler
  const handleWhatsAppShare = useCallback(() => {
    if (isPostHogConfigured()) {
      posthog.capture("share_clicked", {
        result_id: resultId,
        upload_id: uploadId,
        platform: "whatsapp",
        device_type: getDeviceType(),
      })
    }

    addBreadcrumb("Share clicked", "user", { platform: "whatsapp" })

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`
    window.open(whatsappUrl, "_blank", "noopener,noreferrer")
  }, [shareMessage, resultId, uploadId])

  // Story 8.2: iMessage/SMS share handler
  const handleIMessageShare = useCallback(() => {
    const deviceType = getDeviceType()
    const platform = isIOS() ? "imessage" : "sms"

    // AC-3: Track share_clicked with platform discrimination
    if (isPostHogConfigured()) {
      posthog.capture("share_clicked", {
        result_id: resultId,
        upload_id: uploadId,
        platform,
        device_type: deviceType,
      })
    }

    addBreadcrumb("Share clicked", "user", { platform })

    // AC-1, AC-2: Open Messages with pre-filled message
    // iOS uses sms:&body= (ampersand), Android uses sms:?body= (question mark)
    const separator = isIOS() ? "&" : "?"
    const smsUrl = `sms:${separator}body=${encodeURIComponent(shareMessage)}`
    window.location.href = smsUrl
  }, [shareMessage, resultId, uploadId])

  // Story 8.3: Copy link to clipboard
  const handleCopyLink = useCallback(async () => {
    let success = false

    try {
      // AC-1, AC-5: Modern clipboard API (works on all modern browsers)
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl)
        success = true
      } else {
        // AC-6: Fallback for older browsers
        const textArea = document.createElement("textarea")
        textArea.value = shareUrl
        textArea.style.position = "fixed"
        textArea.style.left = "-9999px"
        textArea.style.top = "0"
        textArea.setAttribute("readonly", "")
        document.body.appendChild(textArea)
        textArea.select()
        success = document.execCommand("copy")
        document.body.removeChild(textArea)
      }

      // AC-2: Show confirmation toast
      if (success) {
        toast.success("Link copied!")
      } else {
        throw new Error("Copy failed")
      }
    } catch {
      toast.error("Couldn't copy link. Please try again.")
    }

    // AC-4: Track analytics
    if (isPostHogConfigured()) {
      posthog.capture("share_clicked", {
        result_id: resultId,
        upload_id: uploadId,
        platform: "copy",
        copy_success: success,
        device_type: getDeviceType(),
      })
    }

    addBreadcrumb("Share clicked", "user", { platform: "copy", success })
  }, [shareUrl, resultId, uploadId])

  return (
    <div className="flex gap-3 justify-center flex-wrap">
      {/* Story 8.1: WhatsApp - AC-4: Brand green (#25D366) */}
      <button
        type="button"
        onClick={handleWhatsAppShare}
        className="flex items-center gap-2 px-4 py-3 bg-[#25D366] text-white rounded-lg hover:bg-[#25D366]/90 transition-colors min-h-[48px]"
        aria-label="Share to WhatsApp"
        data-testid="share-whatsapp"
      >
        <WhatsAppIcon className="size-5" />
        <span className="font-body">WhatsApp</span>
      </button>

      {/* Story 8.2: iMessage/SMS - AC-4: iOS blue (#007AFF), AC-5: Only on mobile */}
      {isMobile() && (
        <button
          type="button"
          onClick={handleIMessageShare}
          className="flex items-center gap-2 px-4 py-3 bg-[#007AFF] text-white rounded-lg hover:bg-[#007AFF]/90 transition-colors min-h-[48px]"
          aria-label={isIOS() ? "Share via iMessage" : "Share via SMS"}
          data-testid="share-imessage"
        >
          <MessageIcon className="size-5" />
          <span className="font-body">{isIOS() ? "iMessage" : "Message"}</span>
        </button>
      )}

      {/* Story 8.3: Copy Link - AC-1, AC-5: Available on all devices */}
      <button
        type="button"
        onClick={handleCopyLink}
        className="flex items-center gap-2 px-4 py-3 bg-warm-gray/10 text-charcoal rounded-lg hover:bg-warm-gray/20 transition-colors min-h-[48px]"
        aria-label="Copy share link"
        data-testid="share-copy-link"
      >
        <LinkIcon className="size-5" />
        <span className="font-body">Copy Link</span>
      </button>
    </div>
  )
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

// Story 8.2: Message/iMessage icon
function MessageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
      <path d="M7 9h10v2H7zm0-3h10v2H7z" />
    </svg>
  )
}

// Story 8.3: Link icon for copy button
function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

export default ShareButtons
