import { describe, it, expect, afterEach } from "vitest";
import { hashIP } from "./hash";

describe("hashIP", () => {
  const originalEnv = process.env.IP_HASH_SALT;

  afterEach(() => {
    // Restore original env value
    if (originalEnv !== undefined) {
      process.env.IP_HASH_SALT = originalEnv;
    } else {
      delete process.env.IP_HASH_SALT;
    }
  });

  // Story 7.6 AC-4: IP is hashed for privacy
  describe("Privacy Compliance (AC-4)", () => {
    it("returns a hash, not the original IP", () => {
      const ip = "192.168.1.1";
      const hash = hashIP(ip);

      expect(hash).not.toBe(ip);
      expect(hash).not.toContain(ip);
      // Should be hex string
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it("returns consistent hash for same IP", () => {
      const ip = "10.0.0.1";
      const hash1 = hashIP(ip);
      const hash2 = hashIP(ip);

      expect(hash1).toBe(hash2);
    });

    it("returns different hashes for different IPs", () => {
      const hash1 = hashIP("192.168.1.1");
      const hash2 = hashIP("192.168.1.2");

      expect(hash1).not.toBe(hash2);
    });

    it("returns truncated hash (32 chars max)", () => {
      const hash = hashIP("192.168.1.1");

      expect(hash.length).toBe(32);
    });
  });

  describe("Salt Usage", () => {
    it("produces different hash with different salt", () => {
      // Test that salt affects the hash output
      delete process.env.IP_HASH_SALT; // Use default salt
      const hashWithDefault = hashIP("192.168.1.1");

      process.env.IP_HASH_SALT = "completely-different-salt-value";
      const hashWithCustom = hashIP("192.168.1.1");

      // Same IP, different salts = different hashes
      expect(hashWithDefault).not.toBe(hashWithCustom);
    });

    it("uses default salt when env not set", () => {
      delete process.env.IP_HASH_SALT;
      const hash = hashIP("192.168.1.1");

      // Should still produce valid hash
      expect(hash).toMatch(/^[a-f0-9]{32}$/);
    });
  });

  describe("Edge Cases", () => {
    it("handles IPv6 addresses", () => {
      const hash = hashIP("2001:0db8:85a3:0000:0000:8a2e:0370:7334");

      expect(hash).toMatch(/^[a-f0-9]{32}$/);
    });

    it("handles localhost", () => {
      const hash = hashIP("127.0.0.1");

      expect(hash).toMatch(/^[a-f0-9]{32}$/);
    });

    it("handles empty string", () => {
      const hash = hashIP("");

      expect(hash).toMatch(/^[a-f0-9]{32}$/);
    });

    it("handles IP with port stripped", () => {
      // Ports should be stripped before calling hashIP
      const hash1 = hashIP("192.168.1.1");
      const hash2 = hashIP("192.168.1.1:443");

      // These should be different because the function doesn't strip ports
      // (port stripping is responsibility of caller)
      expect(hash1).not.toBe(hash2);
    });
  });
});
