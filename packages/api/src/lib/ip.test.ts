import { describe, it, expect } from "vitest"

import { getClientIP, hashIP, isPrivateIP, isValidIPFormat } from "./ip"

// =============================================================================
// Mock Hono Context
// =============================================================================

function createMockContext(headers: Record<string, string>) {
  return {
    req: {
      header: (name: string) => headers[name.toLowerCase()] || null,
    },
  } as unknown as Parameters<typeof getClientIP>[0]
}

// =============================================================================
// Tests: getClientIP
// =============================================================================

describe("getClientIP", () => {
  it("returns Cloudflare IP when cf-connecting-ip header is present", () => {
    const ctx = createMockContext({
      "cf-connecting-ip": "203.0.113.195",
      "x-forwarded-for": "192.168.1.1",
    })

    expect(getClientIP(ctx)).toBe("203.0.113.195")
  })

  it("returns first IP from x-forwarded-for when cf-connecting-ip is absent", () => {
    const ctx = createMockContext({
      "x-forwarded-for": "203.0.113.195, 70.41.3.18, 150.172.238.178",
    })

    expect(getClientIP(ctx)).toBe("203.0.113.195")
  })

  it("returns x-real-ip when forwarded headers are absent", () => {
    const ctx = createMockContext({
      "x-real-ip": "203.0.113.195",
    })

    expect(getClientIP(ctx)).toBe("203.0.113.195")
  })

  it("returns 'unknown' when no IP headers are present", () => {
    const ctx = createMockContext({})

    expect(getClientIP(ctx)).toBe("unknown")
  })

  it("handles empty x-forwarded-for gracefully", () => {
    const ctx = createMockContext({
      "x-forwarded-for": "",
    })

    expect(getClientIP(ctx)).toBe("unknown")
  })

  it("trims whitespace from x-forwarded-for entries", () => {
    const ctx = createMockContext({
      "x-forwarded-for": "  203.0.113.195  , 70.41.3.18",
    })

    expect(getClientIP(ctx)).toBe("203.0.113.195")
  })
})

// =============================================================================
// Tests: hashIP
// =============================================================================

describe("hashIP", () => {
  it("returns a 16-character hash", () => {
    const hash = hashIP("203.0.113.195")
    expect(hash).toHaveLength(16)
  })

  it("returns consistent hash for same IP", () => {
    const hash1 = hashIP("203.0.113.195")
    const hash2 = hashIP("203.0.113.195")
    expect(hash1).toBe(hash2)
  })

  it("returns different hash for different IPs", () => {
    const hash1 = hashIP("203.0.113.195")
    const hash2 = hashIP("203.0.113.196")
    expect(hash1).not.toBe(hash2)
  })

  it("handles 'unknown' IP", () => {
    const hash = hashIP("unknown")
    expect(hash).toHaveLength(16)
  })

  it("produces hexadecimal output", () => {
    const hash = hashIP("192.168.1.1")
    expect(hash).toMatch(/^[a-f0-9]{16}$/)
  })
})

// =============================================================================
// Tests: isPrivateIP
// =============================================================================

describe("isPrivateIP", () => {
  it("identifies 10.x.x.x as private", () => {
    expect(isPrivateIP("10.0.0.1")).toBe(true)
    expect(isPrivateIP("10.255.255.255")).toBe(true)
  })

  it("identifies 172.16.x.x - 172.31.x.x as private", () => {
    expect(isPrivateIP("172.16.0.1")).toBe(true)
    expect(isPrivateIP("172.31.255.255")).toBe(true)
    expect(isPrivateIP("172.15.0.1")).toBe(false)
    expect(isPrivateIP("172.32.0.1")).toBe(false)
  })

  it("identifies 192.168.x.x as private", () => {
    expect(isPrivateIP("192.168.0.1")).toBe(true)
    expect(isPrivateIP("192.168.255.255")).toBe(true)
  })

  it("identifies localhost as private", () => {
    expect(isPrivateIP("127.0.0.1")).toBe(true)
    expect(isPrivateIP("localhost")).toBe(true)
  })

  it("identifies public IPs as not private", () => {
    expect(isPrivateIP("8.8.8.8")).toBe(false)
    expect(isPrivateIP("203.0.113.195")).toBe(false)
    expect(isPrivateIP("1.1.1.1")).toBe(false)
  })
})

// =============================================================================
// Tests: isValidIPFormat
// =============================================================================

describe("isValidIPFormat", () => {
  it("validates correct IPv4 addresses", () => {
    expect(isValidIPFormat("192.168.1.1")).toBe(true)
    expect(isValidIPFormat("8.8.8.8")).toBe(true)
    expect(isValidIPFormat("0.0.0.0")).toBe(true)
    expect(isValidIPFormat("255.255.255.255")).toBe(true)
  })

  it("rejects invalid IPv4 addresses", () => {
    expect(isValidIPFormat("256.1.1.1")).toBe(false)
    expect(isValidIPFormat("1.1.1")).toBe(false)
    expect(isValidIPFormat("1.1.1.1.1")).toBe(false)
  })

  it("rejects empty or unknown values", () => {
    expect(isValidIPFormat("")).toBe(false)
    expect(isValidIPFormat("unknown")).toBe(false)
  })

  it("validates IPv6-like addresses", () => {
    expect(isValidIPFormat("::1")).toBe(true)
    expect(isValidIPFormat("2001:0db8:85a3:0000:0000:8a2e:0370:7334")).toBe(true)
  })
})
