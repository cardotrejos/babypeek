import { useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { posthog, isPostHogConfigured } from "@/lib/posthog";
import { clearSession } from "@/lib/session";
import { API_BASE_URL } from "@/lib/api-config";

interface DeleteDataButtonProps {
  uploadId: string;
  sessionToken: string;
}

/**
 * DeleteDataButton Component
 * Story 8.6: Delete My Data Button (GDPR)
 *
 * AC-1: Tap "Delete My Data" shows confirmation dialog
 * AC-5: Shows confirmation "Your data has been deleted"
 * AC-6: Redirects to homepage
 * AC-7: Session token cleared from localStorage
 */
export function DeleteDataButton({ uploadId, sessionToken }: DeleteDataButtonProps) {
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // AC-2: Call DELETE /api/data/:token
  const handleDelete = useCallback(async () => {
    // Task 4: Track deletion requested (no PII)
    if (isPostHogConfigured()) {
      posthog.capture("data_deletion_requested", {
        upload_id: uploadId,
      });
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/data/${sessionToken}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete data");
      }

      // AC-7: Clear localStorage
      clearSession(uploadId);
      // Also clear result mapping
      try {
        localStorage.removeItem(`babypeek-result-upload-${uploadId}`);
      } catch {
        // Silent fail
      }

      // Task 4: Track deletion completed
      if (isPostHogConfigured()) {
        posthog.capture("data_deletion_completed", {
          upload_id: uploadId,
        });
      }

      // AC-5: Show success message
      toast.success("Your data has been deleted");

      // AC-6: Redirect to homepage
      navigate({ to: "/" });
    } catch (error) {
      console.error("[DeleteDataButton] Error:", error);
      // L1 Fix: Show more specific error based on response
      const errorMessage =
        error instanceof Error && error.message.includes("not found")
          ? "Your data may have already been deleted."
          : "Couldn't delete your data. Please try again.";
      toast.error(errorMessage);
      setIsDeleting(false);
      setIsOpen(false);
    }
  }, [uploadId, sessionToken, navigate]);

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            Delete My Data
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Your Data?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete your ultrasound image and AI portrait. This action cannot
            be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <Button
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting}
            className="bg-red-500 hover:bg-red-600"
          >
            {isDeleting ? "Deleting..." : "Delete Everything"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
