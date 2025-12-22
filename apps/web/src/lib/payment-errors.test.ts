import { describe, it, expect } from "vitest"
import { getPaymentErrorMessage, paymentErrorMessages } from "./payment-errors"

describe("payment-errors", () => {
  describe("paymentErrorMessages", () => {
    it("should have all expected error types", () => {
      expect(paymentErrorMessages).toHaveProperty("cancelled")
      expect(paymentErrorMessages).toHaveProperty("payment_failed")
      expect(paymentErrorMessages).toHaveProperty("card_declined")
      expect(paymentErrorMessages).toHaveProperty("expired")
      expect(paymentErrorMessages).toHaveProperty("generic")
    })

    it("should have user-friendly messages", () => {
      expect(paymentErrorMessages.cancelled).toContain("No worries")
      expect(paymentErrorMessages.payment_failed).toContain("try again")
      expect(paymentErrorMessages.card_declined).toContain("declined")
    })
  })

  describe("getPaymentErrorMessage", () => {
    it("should return null for null input", () => {
      expect(getPaymentErrorMessage(null)).toBeNull()
    })

    it("should return correct message for cancelled", () => {
      expect(getPaymentErrorMessage("cancelled")).toBe(
        "No worries! Your photo is still here when you're ready."
      )
    })

    it("should return correct message for payment_failed", () => {
      expect(getPaymentErrorMessage("payment_failed")).toBe(
        "Payment didn't go through. Let's try again!"
      )
    })

    it("should return correct message for card_declined", () => {
      expect(getPaymentErrorMessage("card_declined")).toBe(
        "Your card was declined. Try a different payment method?"
      )
    })

    it("should return correct message for expired", () => {
      expect(getPaymentErrorMessage("expired")).toBe(
        "The checkout session expired. Let's start fresh!"
      )
    })

    it("should return generic message for unknown error types", () => {
      expect(getPaymentErrorMessage("unknown_error")).toBe(
        "Something went wrong. Let's try that again!"
      )
    })

    it("should return generic message for empty string", () => {
      // Empty string is falsy but not null
      expect(getPaymentErrorMessage("")).toBeNull()
    })
  })
})
