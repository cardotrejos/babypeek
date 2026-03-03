import { useCallback, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { toast } from "sonner";

import { CheckEmail, UploadForm } from "@/components/upload";
import type { UploadResult } from "@/hooks/use-upload";
import { API_BASE_URL } from "@/lib/api-config";
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
  const [pendingUploadResult, setPendingUploadResult] = useState<
    (UploadResult & { email: string }) | null
  >(null);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");

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

        const { error } = await signIn.magicLink({
          email: result.email,
          callbackURL,
        });

        if (error) {
          throw new Error(error.message || "Failed to send magic link. Please try again.");
        }

        setPendingEmail(result.email);
        setPendingUploadResult(result);
      } catch (error) {
        setPendingUploadResult(result);
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
    setPendingUploadResult(null);
    setIsEditingEmail(false);
    setNewEmail("");
  }, []);

  const handleStartEditingEmail = useCallback(() => {
    setIsEditingEmail(true);
    setNewEmail(pendingUploadResult?.email || "");
  }, [pendingUploadResult]);

  const handleSubmitNewEmail = useCallback(async () => {
    if (!pendingUploadResult || !newEmail) return;
    
    setIsSendingMagicLink(true);
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/upload/${pendingUploadResult.uploadId}/email`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Upload-Cleanup-Token": pendingUploadResult.cleanupToken,
          },
          body: JSON.stringify({ email: newEmail }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update email");
      }

      const data = await response.json();
      const updatedResult = { 
        ...pendingUploadResult, 
        email: newEmail,
        cleanupToken: data.cleanupToken || pendingUploadResult.cleanupToken
      };
      setIsEditingEmail(false);
      await handleUploadComplete(updatedResult);
    } catch (error) {
      toast.error("Failed to update email. Please try again.");
      setIsSendingMagicLink(false);
    }
  }, [pendingUploadResult, newEmail, handleUploadComplete]);

  const handleRetryMagicLink = useCallback(async () => {
    if (!pendingUploadResult) return;
    await handleUploadComplete(pendingUploadResult);
  }, [pendingUploadResult, handleUploadComplete]);

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
          <CheckEmail
            email={pendingEmail}
            onTryDifferentEmail={handleTryDifferentEmail}
            onResend={handleRetryMagicLink}
            isResending={isSendingMagicLink}
          />
        ) : pendingUploadResult ? (
          <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
            <div className="text-center space-y-2">
              <h3 className="font-display text-xl text-charcoal">Upload Complete</h3>
              {isEditingEmail ? (
                <p className="text-sm text-warm-gray">
                  Enter a different email address to receive the magic link.
                </p>
              ) : (
                <p className="text-sm text-warm-gray">
                  Your image was uploaded successfully, but we couldn't send the magic link to{" "}
                  <strong>{pendingUploadResult.email}</strong>.
                </p>
              )}
            </div>
            {isEditingEmail ? (
              <div className="flex flex-col gap-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 border border-warm-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral"
                  disabled={isSendingMagicLink}
                />
                <button
                  onClick={handleSubmitNewEmail}
                  disabled={isSendingMagicLink || !newEmail}
                  className="w-full px-6 py-3 bg-coral text-white font-body rounded-lg hover:bg-coral/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSendingMagicLink ? "Sending..." : "Send Magic Link"}
                </button>
                <button
                  onClick={() => setIsEditingEmail(false)}
                  disabled={isSendingMagicLink}
                  className="w-full px-6 py-3 bg-charcoal/10 text-charcoal font-body rounded-lg hover:bg-charcoal/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleRetryMagicLink}
                  disabled={isSendingMagicLink}
                  className="w-full px-6 py-3 bg-coral text-white font-body rounded-lg hover:bg-coral/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSendingMagicLink ? "Sending..." : "Resend Magic Link"}
                </button>
                <button
                  onClick={handleStartEditingEmail}
                  disabled={isSendingMagicLink}
                  className="w-full px-6 py-3 bg-charcoal/10 text-charcoal font-body rounded-lg hover:bg-charcoal/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Try Different Email
                </button>
              </div>
            )}
          </div>
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
