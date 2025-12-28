// Test setup for API package
import { vi } from "vitest";

// Mock environment variables for tests
vi.stubEnv("NODE_ENV", "test");
vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test");
