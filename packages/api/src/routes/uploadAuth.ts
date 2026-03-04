export interface UploadAuthorizationInput {
  uploadUserId: string;
  uploadStatus: string;
  sessionUserId: string | null | undefined;
  cleanupToken: string | null | undefined;
  isCleanupTokenValid: boolean;
}

export const canAccessUpload = ({
  uploadUserId,
  uploadStatus,
  sessionUserId,
  cleanupToken,
  isCleanupTokenValid,
}: UploadAuthorizationInput): boolean => {
  if (sessionUserId === uploadUserId) {
    return true;
  }

  const hasCleanupToken = typeof cleanupToken === "string" && cleanupToken.length > 0;
  return uploadStatus === "pending" && hasCleanupToken && isCleanupTokenValid;
};
