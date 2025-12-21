import type { Context } from "hono"
import { createHash } from "crypto"

// =============================================================================
// IP Extraction
// =============================================================================

/**
 * Extract real client IP from request headers
 * 
 * Priority order:
 * 1. CF-Connecting-IP (Cloudflare)
 * 2. X-Forwarded-For (Standard proxy, first IP)
 * 3. X-Real-IP (Nginx)
 * 4. Fallback to 'unknown'
 */
export function getClientIP(c: Context): string {
  // Cloudflare provides the real client IP
  const cfIP = c.req.header("cf-connecting-ip")
  if (cfIP) return cfIP

  // Standard proxy header (might contain multiple IPs)
  const forwardedFor = c.req.header("x-forwarded-for")
  if (forwardedFor) {
    // First IP in the chain is the original client
    const firstIP = forwardedFor.split(",")[0]?.trim()
    if (firstIP) return firstIP
  }

  // Nginx reverse proxy
  const realIP = c.req.header("x-real-ip")
  if (realIP) return realIP

  return "unknown"
}

// =============================================================================
// IP Hashing (GDPR Compliance)
// =============================================================================

/**
 * Hash IP address for privacy-safe logging and storage
 * 
 * Uses SHA-256 with a salt to create a one-way hash.
 * The hash can be used for rate limiting while not storing actual IPs.
 */
export function hashIP(ip: string): string {
  // Use environment variable for salt, or a default for development
  // In production, IP_HASH_SALT should be set
  const salt = process.env.IP_HASH_SALT || "3d-ultra-rate-limit-salt"

  return createHash("sha256")
    .update(`${ip}:${salt}`)
    .digest("hex")
    .slice(0, 16) // Truncate to 16 chars for readability
}

// =============================================================================
// IP Utilities
// =============================================================================

/**
 * Check if an IP address appears to be a private/internal IP
 * These should typically not be rate limited
 */
export function isPrivateIP(ip: string): boolean {
  // IPv4 private ranges and IPv6 loopback
  const privateRanges = [
    /^10\./, // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
    /^192\.168\./, // 192.168.0.0/16
    /^127\./, // IPv4 Loopback
    /^localhost$/i,
    /^::1$/, // IPv6 Loopback
    /^::ffff:127\./, // IPv4-mapped loopback in IPv6
  ]

  return privateRanges.some((range) => range.test(ip))
}

/**
 * Validate IP format (basic validation)
 */
export function isValidIPFormat(ip: string): boolean {
  if (!ip || ip === "unknown") return false

  // Basic IPv4 validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
  if (ipv4Regex.test(ip)) {
    const parts = ip.split(".").map(Number)
    return parts.every((part) => part >= 0 && part <= 255)
  }

  // IPv6 validation (more strict)
  // Must have at least one colon, can contain hex digits and colons
  // Supports compressed notation (::) and IPv4-mapped addresses
  const ipv6Regex = /^(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}$|^(?:[a-fA-F0-9]{1,4}:){1,7}:$|^(?:[a-fA-F0-9]{1,4}:){1,6}:[a-fA-F0-9]{1,4}$|^(?:[a-fA-F0-9]{1,4}:){1,5}(?::[a-fA-F0-9]{1,4}){1,2}$|^(?:[a-fA-F0-9]{1,4}:){1,4}(?::[a-fA-F0-9]{1,4}){1,3}$|^(?:[a-fA-F0-9]{1,4}:){1,3}(?::[a-fA-F0-9]{1,4}){1,4}$|^(?:[a-fA-F0-9]{1,4}:){1,2}(?::[a-fA-F0-9]{1,4}){1,5}$|^[a-fA-F0-9]{1,4}:(?::[a-fA-F0-9]{1,4}){1,6}$|^:(?::[a-fA-F0-9]{1,4}){1,7}$|^::$|^::1$/
  if (ipv6Regex.test(ip)) {
    return true
  }

  return false
}
