# Story 5.6: Download Preview Button

Status: ready-for-dev

## Story

As a **user**,
I want **to download the watermarked preview**,
so that **I can share it even without purchasing**.

## Acceptance Criteria

1. **AC-1:** Given I'm viewing my result, when I tap "Download Preview", then the watermarked image downloads to my device (FR-3.6)
2. **AC-2:** The filename is "3d-ultra-preview-{date}.jpg"
3. **AC-3:** The download is tracked in PostHog

## Tasks / Subtasks

- [ ] **Task 1: Create DownloadPreviewButton component** (AC: 1)
  - [ ] Create `apps/web/src/components/reveal/DownloadPreviewButton.tsx`
  - [ ] Accept previewUrl as prop
  - [ ] Use download attribute or fetch+blob approach
  - [ ] Show loading state during download
  - [ ] Handle download errors gracefully

- [ ] **Task 2: Implement download logic** (AC: 1, 2)
  - [ ] Fetch preview image as blob (to set custom filename)
  - [ ] Create object URL from blob
  - [ ] Create temporary anchor with download attribute
  - [ ] Trigger click and cleanup
  - [ ] Filename format: "3d-ultra-preview-2024-12-21.jpg"

- [ ] **Task 3: Add download analytics** (AC: 3)
  - [ ] Track `preview_download_started` when button clicked
  - [ ] Track `preview_download_completed` when download succeeds
  - [ ] Track `preview_download_failed` with error info
  - [ ] Include result_id in all events

- [ ] **Task 4: Integrate into RevealUI** (AC: 1)
  - [ ] Add DownloadPreviewButton to RevealUI component
  - [ ] Position as secondary action (below primary CTA)
  - [ ] Use ghost/outline button variant
  - [ ] Add download icon

- [ ] **Task 5: Handle mobile download UX** (AC: 1)
  - [ ] iOS Safari: opens image in new tab (user saves from there)
  - [ ] Android Chrome: direct download works
  - [ ] Show appropriate messaging for iOS users
  - [ ] Test on actual devices

- [ ] **Task 6: Write tests**
  - [ ] Unit test: Button triggers download
  - [ ] Unit test: Filename includes correct date
  - [ ] Unit test: Analytics events fire
  - [ ] Unit test: Error state displays correctly

## Dev Notes

### Architecture Compliance

- **Location:** `apps/web/src/components/reveal/DownloadPreviewButton.tsx`
- **Analytics:** PostHog via existing analytics integration
- **Pattern:** Presentational component with download logic

### DownloadPreviewButton Component

```typescript
// apps/web/src/components/reveal/DownloadPreviewButton.tsx
import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { posthog, isPostHogConfigured } from '@/lib/posthog'

interface DownloadPreviewButtonProps {
  previewUrl: string
  resultId: string
  variant?: 'default' | 'outline' | 'ghost'
}

export function DownloadPreviewButton({ 
  previewUrl, 
  resultId,
  variant = 'ghost' 
}: DownloadPreviewButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = async () => {
    setIsDownloading(true)
    setError(null)

    // Track download started
    if (isPostHogConfigured()) {
      posthog.capture('preview_download_started', { result_id: resultId })
    }

    try {
      // Fetch the image as blob
      const response = await fetch(previewUrl)
      if (!response.ok) throw new Error('Failed to fetch image')
      
      const blob = await response.blob()
      
      // Create download filename with date
      const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD
      const filename = `3d-ultra-preview-${date}.jpg`
      
      // Create object URL and trigger download
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      
      // Append to body, click, and cleanup
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      // Track download completed
      if (isPostHogConfigured()) {
        posthog.capture('preview_download_completed', { result_id: resultId })
      }
    } catch (err) {
      console.error('Download failed:', err)
      setError('Download failed. Please try again.')
      
      // Track download failed
      if (isPostHogConfigured()) {
        posthog.capture('preview_download_failed', {
          result_id: resultId,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div>
      <Button
        variant={variant}
        onClick={handleDownload}
        disabled={isDownloading}
        className="gap-2"
      >
        {isDownloading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        {isDownloading ? 'Downloading...' : 'Download Preview'}
      </Button>
      
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  )
}
```

### Integration in RevealUI

```typescript
// apps/web/src/components/reveal/RevealUI.tsx (update)
import { DownloadPreviewButton } from './DownloadPreviewButton'

export function RevealUI({ resultId, previewUrl, onPurchase, onShare }: RevealUIProps) {
  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl space-y-4">
      {/* Primary CTA */}
      <Button 
        size="lg" 
        className="w-full bg-coral hover:bg-coral/90 text-white font-body text-lg py-6"
        onClick={onPurchase}
      >
        Get HD Version - $9.99
      </Button>
      
      {/* Secondary actions */}
      <div className="flex gap-3">
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={onShare}
        >
          Share
        </Button>
        <DownloadPreviewButton
          previewUrl={previewUrl}
          resultId={resultId}
          variant="ghost"
        />
      </div>
    </div>
  )
}
```

### iOS Safari Handling

iOS Safari doesn't support programmatic downloads the same way. Alternative approach:

```typescript
// Detect iOS Safari
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

const handleDownload = async () => {
  if (isIOS) {
    // iOS: Open image in new tab, user can long-press to save
    window.open(previewUrl, '_blank')
    
    // Show toast with instructions
    toast({
      title: 'Saving on iOS',
      description: 'Long-press the image and tap "Add to Photos"',
      duration: 5000,
    })
    return
  }
  
  // Standard download for other browsers
  // ... existing blob download logic
}
```

### Filename Format

```typescript
// Format: 3d-ultra-preview-YYYY-MM-DD.jpg
const formatFilename = () => {
  const date = new Date()
  const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
  return `3d-ultra-preview-${dateStr}.jpg`
}

// Examples:
// 3d-ultra-preview-2024-12-21.jpg
// 3d-ultra-preview-2025-01-15.jpg
```

### Analytics Events

```typescript
// Download started
posthog.capture('preview_download_started', {
  result_id: resultId,
  is_ios: isIOS,
})

// Download completed
posthog.capture('preview_download_completed', {
  result_id: resultId,
  filename: filename,
})

// Download failed
posthog.capture('preview_download_failed', {
  result_id: resultId,
  error_type: 'FETCH_FAILED' | 'BLOB_FAILED' | 'UNKNOWN',
  error_message: string,
})
```

### Error Handling

| Error | User Message |
|-------|--------------|
| Fetch failed | "Download failed. Please try again." |
| Network offline | "Please check your connection and try again." |
| iOS restriction | (Show instructions toast) |

### File Structure

```
apps/web/src/components/reveal/
├── DownloadPreviewButton.tsx     <- NEW: Download button
├── DownloadPreviewButton.test.tsx <- NEW: Tests
├── RevealUI.tsx                  <- UPDATE: Add download button
```

### Dependencies

- **Story 5.2 (Watermark):** ✅ Preview image URL available
- **Story 5.3 (Reveal):** RevealUI component exists
- **PostHog:** ✅ Analytics configured

### Mobile Testing Matrix

| Platform | Browser | Download Method |
|----------|---------|-----------------|
| iOS | Safari | Open in new tab + instructions |
| iOS | Chrome | Open in new tab + instructions |
| Android | Chrome | Direct blob download |
| Android | Samsung | Direct blob download |
| Desktop | Chrome | Direct blob download |
| Desktop | Safari | Direct blob download |
| Desktop | Firefox | Direct blob download |

### References

- [Source: _bmad-output/epics.md#Story 5.6] - Acceptance criteria
- [Source: _bmad-output/prd.md#FR-3.6] - Download preview with watermark requirement
- [Source: _bmad-output/ux-design-specification.md#Custom Components] - DownloadButton spec

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
