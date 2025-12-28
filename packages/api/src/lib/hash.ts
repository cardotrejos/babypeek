import { createHash } from "crypto";

/**
 * Hash an IP address for privacy-compliant storage
 * Story 7.6 AC-4: Never store raw IP addresses
 *
 * Uses SHA-256 with a server-side salt to:
 * - Prevent rainbow table attacks
 * - Allow abuse detection (same IP = same hash)
 * - Comply with GDPR (hashed data = pseudonymized)
 *
 * Note: Uses process.env directly for simplicity and testability.
 * The env module validates IP_HASH_SALT at startup if provided.
 */
export function hashIP(ip: string): string {
  // Use environment salt or default (in production, should always have env salt)
  const salt = process.env.IP_HASH_SALT || "babypeek-default-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").substring(0, 32); // Truncate for storage efficiency
}
