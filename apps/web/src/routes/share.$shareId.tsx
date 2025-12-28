import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { GiftCheckoutButton } from "@/components/payment/GiftCheckoutButton";
import { ExpiredResult } from "@/components/states";
import { API_BASE_URL } from "@/lib/api-config";
import { posthog, isPostHogConfigured } from "@/lib/posthog";

/**
 * Share Page
 * Story 6.7: Gift Purchase Option (AC-1, AC-5)
 * Story 8.4: Share Page with Watermarked Preview
 *
 * Public page for sharing baby portraits with gift purchase option.
 * - Shows watermarked preview (no HD access)
 * - Prominent "Gift This Photo" CTA
 * - Explains that HD goes to the parent
 * - AC-1: Shows watermarked preview image
 * - AC-2: Contextual messaging about AI creation
 * - AC-3: Mobile-optimized layout
 * - AC-4: OG meta tags (requires server-side for crawlers)
 * - AC-5: Expired results show friendly error
 * - AC-6: Fast loading (no auth required)
 */
export const Route = createFileRoute("/share/$shareId")({
  component: SharePage,
});

interface ShareData {
  shareId: string;
  uploadId: string;
  previewUrl: string;
}

function SharePage() {
  const { shareId } = Route.useParams();
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate({ to: "/" });
  };

  // Fetch shared result (public, no auth needed)
  const {
    data: result,
    isLoading,
    error,
  } = useQuery<ShareData>({
    queryKey: ["share", shareId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/share/${shareId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("This portrait is no longer available");
        }
        throw new Error("Failed to load portrait");
      }

      return response.json();
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Story 8.4 - Analytics: Track share page view (with dedup)
  const analyticsTrackedRef = useRef(false);
  useEffect(() => {
    if (isPostHogConfigured() && result && !analyticsTrackedRef.current) {
      analyticsTrackedRef.current = true;
      posthog.capture("share_page_viewed", {
        share_id: shareId,
        referrer: document.referrer || "direct",
      });
    }
  }, [shareId, result]);

  // Update document title for users (AC-4 partial - crawlers need server-side)
  useEffect(() => {
    document.title = "See what AI created! ✨ | BabyPeek";
    return () => {
      document.title = "BabyPeek | Transform Your 4D Ultrasound into a Baby Portrait";
    };
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="size-12 animate-spin rounded-full border-4 border-coral border-t-transparent mx-auto" />
          <p className="font-body text-warm-gray">Loading portrait...</p>
        </div>
      </div>
    );
  }

  // Error state - Story 8.8 AC-4: Same experience for expired share links
  if (error || !result) {
    return <ExpiredResult resultId={shareId} source="share" />;
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-md mx-auto px-4 py-8 space-y-6">
        {/* Header - AC-2: Contextual messaging */}
        <div className="text-center space-y-2">
          <h1 className="font-display text-2xl text-charcoal">
            See what AI created from an ultrasound! ✨
          </h1>
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
            onError={(e) => {
              // Fallback to placeholder on image load error
              e.currentTarget.src = "/og-image.png";
            }}
          />
          {/* Watermark overlay indicator */}
          <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded">
            Preview
          </div>
        </div>

        {/* Gift CTA Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <div className="text-center space-y-2">
            <h2 className="font-display text-lg text-charcoal">🎁 Gift the HD Version</h2>
            <p className="font-body text-sm text-warm-gray">
              Surprise the expecting parent with the full resolution portrait!
            </p>
          </div>

          <GiftCheckoutButton shareId={shareId} uploadId={result.uploadId} />

          {/* AC-5: Clear explanation */}
          <p className="text-center text-xs text-warm-gray/70">
            💌 The HD photo will be sent to the parent
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-warm-gray/20" />
          <span className="text-xs text-warm-gray/50">or</span>
          <div className="flex-1 h-px bg-warm-gray/20" />
        </div>

        {/* Try it yourself CTA */}
        <div className="text-center space-y-3">
          <p className="font-body text-warm-gray">Want your own AI baby portrait?</p>
          <Button variant="outline" className="w-full" onClick={handleGoHome}>
            Try BabyPeek Free
          </Button>
        </div>

        {/* Footer */}
        <footer className="text-center pt-4">
          <p className="text-xs text-warm-gray/50">
            Powered by{" "}
            <Link to="/" className="text-coral hover:underline">
              BabyPeek
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
