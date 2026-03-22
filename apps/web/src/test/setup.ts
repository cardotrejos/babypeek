import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Mock react-helmet-async so components using <Helmet> don't crash without a provider
vi.mock("react-helmet-async", () => ({
  Helmet: ({ children }: { children?: unknown }) => null,
  HelmetProvider: ({ children }: { children: unknown }) => children,
}));

// Setup localStorage mock (jsdom's implementation may be incomplete)
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

// Cleanup after each test
afterEach(() => {
  cleanup();
  localStorage.clear();
});

// Mock URL.createObjectURL / revokeObjectURL
global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
global.URL.revokeObjectURL = vi.fn();

// Mock PostHog
vi.mock("posthog-js/react", () => ({
  usePostHog: () => ({
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
  }),
  PostHogProvider: ({ children }: { children: unknown }) => children,
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
  Toaster: () => null,
}));

// Mock Sentry
vi.mock("@sentry/react", () => ({
  captureException: vi.fn(),
  init: vi.fn(),
  withScope: vi.fn(),
}));
