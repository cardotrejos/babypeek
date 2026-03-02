import { useCallback, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { toast } from "sonner";

import { CheckEmail, UploadForm } from "@/components/upload";
import type { UploadResult } from "@/hooks/use-upload";
import { signIn } from "@/lib/auth-client";

export interface UploadSectionProps {
  /** Optional id for scroll targeting */
  id?: string;
}

type PromptVersion = "v3" | "v3-json" | "v4" | "v4-json";

const PROMPT_OPTIONS: { value: PromptVersion; label: string }[] = [
  { value: "v4", label: "v4 - National Geographic Style" },
  { value: "v4-json", label: "v4-json - National Geographic (JSON)" },
  { value: "v3", label: "v3 - Close-up In-utero Style" },
  { value: "v3-json", label: "v3-json - Close-up (JSON)" },
];

/**
 * Upload Section - Landing page upload form with navigation
 *
 * Integrates the UploadForm component and navigates to /processing/{jobId}
 * after successful upload.
 *
 * Add ?prompts=true to URL to show prompt selector (for testing)
 */
export function UploadSection({ id }: UploadSectionProps) {
  const search = useSearch({ strict: false }) as { prompts?: boolean };
  const showPromptSelector = search?.prompts === true;

  const [selectedPrompt, setSelectedPrompt] = useState<PromptVersion>("v4");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);

  const handleUploadComplete = useCallback(
    async (result: UploadResult & { email: string }) => {
      setIsSendingMagicLink(true);

      try {
        const callbackPath = showPromptSelector
          ? `/processing/${result.uploadId}?prompts=true&promptVersion=${selectedPrompt}`
          : `/processing/${result.uploadId}`;

        // Must be an absolute URL — Better Auth resolves callbackURL relative to
        // its baseURL (the API server), so a relative path would redirect users
        // to the API instead of the web app after clicking the magic link.
        const callbackURL = `${window.location.origin}${callbackPath}`;

        await signIn.magicLink({
          email: result.email,
          callbackURL,
        });

        setPendingEmail(result.email);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to send magic link. Please try again.",
        );
      } finally {
        setIsSendingMagicLink(false);
      }
    },
    [showPromptSelector, selectedPrompt],
  );

  const handleTryDifferentEmail = useCallback(() => {
    setPendingEmail(null);
  }, []);

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
                      selectedPrompt === option.value ? "border-coral" : "border-warm-gray/50"
                    }`}
                  >
                    {selectedPrompt === option.value && (
                      <div className="size-2 rounded-full bg-coral" />
                    )}
                  </div>
                  <span className="text-sm text-charcoal">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {pendingEmail ? (
          <CheckEmail email={pendingEmail} onTryDifferentEmail={handleTryDifferentEmail} />
        ) : (
          <UploadForm
            enableUpload
            onUploadComplete={handleUploadComplete}
            disabled={isSendingMagicLink}
          />
        )}
      </div>
    </section>
  );
}
