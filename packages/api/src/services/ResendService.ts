import { Effect, Context, Layer, Schedule } from "effect"
import { Resend } from "resend"
import { EmailError } from "../lib/errors"
import { env, isResendConfigured } from "../lib/env"

// Resend Service interface
export class ResendService extends Context.Tag("ResendService")<
  ResendService,
  {
    sendResultEmail: (email: string, resultId: string) => Effect.Effect<void, EmailError>
    sendReceiptEmail: (email: string, purchaseId: string, amount: number) => Effect.Effect<void, EmailError>
    sendDownloadEmail: (email: string, resultId: string, downloadUrl: string) => Effect.Effect<void, EmailError>
  }
>() {}

// Cached Resend client
let cachedResend: Resend | null = null

const getResendClient = (): Effect.Effect<Resend, EmailError> => {
  if (!isResendConfigured()) {
    return Effect.fail(
      new EmailError({
        cause: "SEND_FAILED",
        message: "Resend not configured - missing RESEND_API_KEY",
      })
    )
  }

  if (!cachedResend) {
    cachedResend = new Resend(env.RESEND_API_KEY!)
  }

  return Effect.succeed(cachedResend)
}

// From email configuration using env
const getFromEmail = () => `3d-ultra <${env.FROM_EMAIL}>`

const sendResultEmail = Effect.fn("ResendService.sendResultEmail")(function* (email: string, resultId: string) {
  const resend = yield* getResendClient()
  yield* Effect.tryPromise({
    try: () =>
      resend.emails.send({
        from: getFromEmail(),
        to: email,
        subject: "Your 3d-ultra portrait is ready! 🎉",
        html: `
                <h1>Your baby portrait is ready!</h1>
                <p>View your result: <a href="${env.APP_URL}/result/${resultId}">Click here</a></p>
                <p>This link will remain active for 30 days.</p>
              `,
      }),
    catch: (e) =>
      new EmailError({
        cause: "SEND_FAILED",
        message: String(e),
      }),
  }).pipe(
    Effect.asVoid,
    Effect.retry({ times: 2, schedule: Schedule.exponential("500 millis") }),
    Effect.timeout("30 seconds"),
    Effect.catchTag("TimeoutException", () =>
      Effect.fail(new EmailError({ cause: "SEND_FAILED", message: "Email send timed out" }))
    )
  )
})

const sendReceiptEmail = Effect.fn("ResendService.sendReceiptEmail")(function* (
  email: string,
  purchaseId: string,
  amount: number
) {
  const resend = yield* getResendClient()
  yield* Effect.tryPromise({
    try: () =>
      resend.emails.send({
        from: getFromEmail(),
        to: email,
        subject: "Your 3d-ultra purchase receipt",
        html: `
                <h1>Thank you for your purchase!</h1>
                <p>Amount: $${(amount / 100).toFixed(2)}</p>
                <p>Order ID: ${purchaseId}</p>
                <p>You can now download your HD photo.</p>
              `,
      }),
    catch: (e) =>
      new EmailError({
        cause: "SEND_FAILED",
        message: String(e),
      }),
  }).pipe(
    Effect.asVoid,
    Effect.retry({ times: 2, schedule: Schedule.exponential("500 millis") }),
    Effect.timeout("30 seconds"),
    Effect.catchTag("TimeoutException", () =>
      Effect.fail(new EmailError({ cause: "SEND_FAILED", message: "Email send timed out" }))
    )
  )
})

const sendDownloadEmail = Effect.fn("ResendService.sendDownloadEmail")(function* (
  email: string,
  resultId: string,
  downloadUrl: string
) {
  const resend = yield* getResendClient()
  yield* Effect.tryPromise({
    try: () =>
      resend.emails.send({
        from: getFromEmail(),
        to: email,
        subject: "Your HD photo is ready to download! 📸",
        html: `
                <h1>Download your HD photo</h1>
                <p><a href="${downloadUrl}">Download now</a></p>
                <p>Result ID: ${resultId}</p>
                <p>This link expires in 7 days.</p>
              `,
      }),
    catch: (e) =>
      new EmailError({
        cause: "SEND_FAILED",
        message: String(e),
      }),
  }).pipe(
    Effect.asVoid,
    Effect.retry({ times: 2, schedule: Schedule.exponential("500 millis") }),
    Effect.timeout("30 seconds"),
    Effect.catchTag("TimeoutException", () =>
      Effect.fail(new EmailError({ cause: "SEND_FAILED", message: "Email send timed out" }))
    )
  )
})

// Resend Service implementation
export const ResendServiceLive = Layer.succeed(ResendService, {
  sendResultEmail,
  sendReceiptEmail,
  sendDownloadEmail,
})
