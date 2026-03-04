import { describe, it, expect, vi } from "vitest";
import { Effect } from "effect";
import { FalService, FalServiceLive } from "./FalService";
import { StripeService, StripeServiceLive } from "./StripeService";
import { ResendService, ResendServiceLive } from "./ResendService";
import { PostHogServiceMock } from "./PostHogService";
import { PaymentError, EmailError } from "../lib/errors";

// Mock env module
vi.mock("../lib/env", () => ({
  env: {
    STRIPE_SECRET_KEY: undefined,
    STRIPE_WEBHOOK_SECRET: undefined,
    RESEND_API_KEY: undefined,
    FAL_KEY: undefined,
    APP_URL: "http://localhost:3001",
    PRODUCT_PRICE_CENTS: 999,
    FROM_EMAIL: "test@example.com",
    NODE_ENV: "test",
  },
  isStripeConfigured: () => false,
  isResendConfigured: () => false,
  isFalConfigured: () => false,
}));

describe("Effect Services", () => {
  describe("FalService", () => {
    it("has correct service tag", () => {
      expect(FalService.key).toBe("FalService");
    });

    it("provides generateImageFromUrl method via FalServiceLive", async () => {
      const program = Effect.gen(function* () {
        const service = yield* FalService;
        return typeof service.generateImageFromUrl;
      }).pipe(Effect.provide(FalServiceLive), Effect.provide(PostHogServiceMock));

      const result = await Effect.runPromise(program);
      expect(result).toBe("function");
    });
  });

  describe("StripeService", () => {
    it("has correct service tag", () => {
      expect(StripeService.key).toBe("StripeService");
    });

    it("provides all methods via StripeServiceLive", async () => {
      const program = Effect.gen(function* () {
        const service = yield* StripeService;
        return {
          createCheckoutSession: typeof service.createCheckoutSession,
          constructWebhookEvent: typeof service.constructWebhookEvent,
          retrieveSession: typeof service.retrieveSession,
        };
      }).pipe(Effect.provide(StripeServiceLive));

      const result = await Effect.runPromise(program);
      expect(result.createCheckoutSession).toBe("function");
      expect(result.constructWebhookEvent).toBe("function");
      expect(result.retrieveSession).toBe("function");
    });

    it("createCheckoutSession fails with PaymentError when not configured", async () => {
      const program = Effect.gen(function* () {
        const service = yield* StripeService;
        return yield* service.createCheckoutSession({
          uploadId: "test-upload",
          email: "test@example.com",
          type: "self",
          successUrl: "http://localhost/success",
          cancelUrl: "http://localhost/cancel",
        });
      }).pipe(
        Effect.provide(StripeServiceLive),
        Effect.catchAll((error) => {
          if (error instanceof PaymentError) {
            return Effect.succeed({ error: true, cause: error.cause, message: error.message });
          }
          return Effect.succeed({ error: true, cause: "unknown", message: String(error) });
        }),
      );

      const result = await Effect.runPromise(program);
      expect(result.error).toBe(true);
      expect(result.cause).toBe("STRIPE_ERROR");
      expect(result.message).toContain("not configured");
    });

    it("constructWebhookEvent fails with PaymentError when not configured", async () => {
      const program = Effect.gen(function* () {
        const service = yield* StripeService;
        return yield* service.constructWebhookEvent("payload", "signature");
      }).pipe(
        Effect.provide(StripeServiceLive),
        Effect.catchAll((error) => {
          if (error instanceof PaymentError) {
            return Effect.succeed({ error: true, cause: error.cause });
          }
          return Effect.succeed({ error: true, cause: "unknown" });
        }),
      );

      const result = await Effect.runPromise(program);
      expect(result.error).toBe(true);
    });
  });

  describe("ResendService", () => {
    it("has correct service tag", () => {
      expect(ResendService.key).toBe("ResendService");
    });

    it("provides all email methods via ResendServiceLive", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ResendService;
        return {
          sendResultEmail: typeof service.sendResultEmail,
          sendReceiptEmail: typeof service.sendReceiptEmail,
          sendDownloadEmail: typeof service.sendDownloadEmail,
        };
      }).pipe(Effect.provide(ResendServiceLive));

      const result = await Effect.runPromise(program);
      expect(result.sendResultEmail).toBe("function");
      expect(result.sendReceiptEmail).toBe("function");
      expect(result.sendDownloadEmail).toBe("function");
    });

    it("sendResultEmail fails with EmailError when not configured", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ResendService;
        return yield* service.sendResultEmail("test@example.com", "result-123");
      }).pipe(
        Effect.provide(ResendServiceLive),
        Effect.catchAll((error) => {
          if (error instanceof EmailError) {
            return Effect.succeed({ error: true, cause: error.cause, message: error.message });
          }
          return Effect.succeed({ error: true, cause: "unknown", message: String(error) });
        }),
      );

      const result = await Effect.runPromise(program);
      expect(result.error).toBe(true);
      expect(result.cause).toBe("SEND_FAILED");
      expect(result.message).toContain("not configured");
    });

    it("sendReceiptEmail fails with EmailError when not configured", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ResendService;
        return yield* service.sendReceiptEmail("test@example.com", "purchase-123", 999);
      }).pipe(
        Effect.provide(ResendServiceLive),
        Effect.catchAll((error) => {
          if (error instanceof EmailError) {
            return Effect.succeed({ error: true, cause: error.cause });
          }
          return Effect.succeed({ error: true, cause: "unknown" });
        }),
      );

      const result = await Effect.runPromise(program);
      expect(result.error).toBe(true);
      expect(result.cause).toBe("SEND_FAILED");
    });

    it("sendDownloadEmail fails with EmailError when not configured", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ResendService;
        return yield* service.sendDownloadEmail(
          "test@example.com",
          "result-123",
          "http://download.url",
        );
      }).pipe(
        Effect.provide(ResendServiceLive),
        Effect.catchAll((error) => {
          if (error instanceof EmailError) {
            return Effect.succeed({ error: true, cause: error.cause });
          }
          return Effect.succeed({ error: true, cause: "unknown" });
        }),
      );

      const result = await Effect.runPromise(program);
      expect(result.error).toBe(true);
      expect(result.cause).toBe("SEND_FAILED");
    });
  });

  describe("AppServicesLive composition", () => {
    it("exports AppServicesLive layer", async () => {
      const { AppServicesLive } = await import("./index");
      expect(AppServicesLive).toBeDefined();
    });

    it("AppServicesLive provides all services", async () => {
      const { AppServicesLive } = await import("./index");

      // Check that we can access each service through the composed layer
      const program = Effect.gen(function* () {
        const fal = yield* FalService;
        const stripe = yield* StripeService;
        const resend = yield* ResendService;
        return {
          hasFal: !!fal.generateImageFromUrl,
          hasStripe: !!stripe.createCheckoutSession,
          hasResend: !!resend.sendResultEmail,
        };
      }).pipe(Effect.provide(AppServicesLive));

      const result = await Effect.runPromise(program);
      expect(result.hasFal).toBe(true);
      expect(result.hasStripe).toBe(true);
      expect(result.hasResend).toBe(true);
    });
  });
});
