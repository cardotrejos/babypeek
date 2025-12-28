import { Effect, Context, Layer, Schedule } from "effect";
import { Resend } from "resend";
import { EmailError } from "../lib/errors";
import { env, isResendConfigured } from "../lib/env";
import { captureEvent } from "./PostHogService";

// Receipt email params interface (Story 6.5)
export interface ReceiptEmailParams {
  email: string;
  purchaseId: string;
  uploadId: string;
  amount: number; // cents
  isGift: boolean;
}

// Gift confirmation params (Story 6.7 - AC-4)
export interface GiftConfirmationParams {
  email: string; // Purchaser email
  purchaseId: string;
  amount: number; // cents
}

// Gift notification params (Story 6.7 - AC-3)
export interface GiftNotificationParams {
  email: string; // Recipient email (original uploader)
  uploadId: string;
  downloadUrl: string;
}

// Download email params interface (Story 7.4)
export interface DownloadEmailParams {
  email: string;
  uploadId: string;
  downloadUrl: string;
  isGift?: boolean;
}

// HD download email with all variants (after purchase)
export interface HDDownloadEmailParams {
  email: string;
  uploadId: string;
  purchaseId: string;
  amount: number; // cents
  isGift: boolean;
  // All 4 result variants with download URLs
  variants: Array<{
    resultId: string;
    downloadUrl: string;
    previewUrl: string;
    promptVersion: string;
    variantIndex: number;
  }>;
}

// Resend Service interface
export class ResendService extends Context.Tag("ResendService")<
  ResendService,
  {
    sendResultEmail: (email: string, resultId: string) => Effect.Effect<void, EmailError>;
    sendReceiptEmail: (params: ReceiptEmailParams) => Effect.Effect<void, EmailError>;
    sendDownloadEmail: (params: DownloadEmailParams) => Effect.Effect<void, EmailError>;
    // HD download email with all 4 variants after purchase
    sendHDDownloadEmail: (params: HDDownloadEmailParams) => Effect.Effect<void, EmailError>;
    // Story 6.7: Gift purchase emails
    sendGiftConfirmationEmail: (params: GiftConfirmationParams) => Effect.Effect<void, EmailError>;
    sendGiftNotificationEmail: (params: GiftNotificationParams) => Effect.Effect<void, EmailError>;
  }
>() {}

// Cached Resend client
let cachedResend: Resend | null = null;

const getResendClient = (): Effect.Effect<Resend, EmailError> => {
  if (!isResendConfigured()) {
    return Effect.fail(
      new EmailError({
        cause: "SEND_FAILED",
        message: "Resend not configured - missing RESEND_API_KEY",
      }),
    );
  }

  if (!cachedResend) {
    cachedResend = new Resend(env.RESEND_API_KEY!);
  }

  return Effect.succeed(cachedResend);
};

// From email configuration using env
const getFromEmail = () => `BabyPeek <${env.FROM_EMAIL}>`;

const sendResultEmail = Effect.fn("ResendService.sendResultEmail")(function* (
  email: string,
  resultId: string,
) {
  const resend = yield* getResendClient();
  yield* Effect.tryPromise({
    try: () =>
      resend.emails.send({
        from: getFromEmail(),
        to: email,
        subject: "Your BabyPeek portrait is ready! 🎉",
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
      Effect.fail(new EmailError({ cause: "SEND_FAILED", message: "Email send timed out" })),
    ),
  );
});

/**
 * Generate receipt email HTML template (Story 6.5 - AC-4: warm, congratulatory tone)
 */
export const generateReceiptHtml = (params: {
  amount: string;
  date: string;
  downloadUrl: string;
  isGift: boolean;
  purchaseId: string;
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FDF8F5;">
  <div style="background-color: white; border-radius: 16px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <h1 style="color: #E8927C; font-family: 'Playfair Display', Georgia, serif; font-size: 28px; margin-bottom: 8px; text-align: center;">
      Your HD Photo is Ready! 🎉
    </h1>
    
    <p style="color: #6B5B5B; font-size: 16px; line-height: 1.6; text-align: center; margin-bottom: 24px;">
      ${
        params.isGift
          ? "Thank you for your thoughtful gift! The HD photo has been unlocked."
          : "Thank you for your purchase! Your beautiful HD photo is waiting for you."
      }
    </p>
    
    <!-- Download Button -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="${params.downloadUrl}" style="display: inline-block; background-color: #E8927C; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Download HD Photo
      </a>
    </div>
    
    <!-- Purchase Details -->
    <div style="background-color: #FDF8F5; border-radius: 8px; padding: 16px; margin-top: 24px;">
      <p style="color: #6B5B5B; font-size: 14px; margin: 4px 0;">
        <strong>Amount:</strong> ${params.amount}
      </p>
      <p style="color: #6B5B5B; font-size: 14px; margin: 4px 0;">
        <strong>Date:</strong> ${params.date}
      </p>
      <p style="color: #6B5B5B; font-size: 14px; margin: 4px 0;">
        <strong>Order ID:</strong> ${params.purchaseId}
      </p>
    </div>
    
    <!-- Footer -->
    <p style="color: #9B8B8B; font-size: 12px; text-align: center; margin-top: 24px;">
      Your download link will remain active for 30 days.
      <br>
      Questions? Reply to this email.
    </p>
    
  </div>
</body>
</html>
`;

/**
 * Send receipt email with enhanced template (Story 6.5)
 * AC-1: Email sent via Resend after purchase
 * AC-2: Includes purchase amount and date
 * AC-3: Includes download link
 * AC-4: Warm, congratulatory tone
 */
const sendReceiptEmail = Effect.fn("ResendService.sendReceiptEmail")(function* (
  params: ReceiptEmailParams,
) {
  const resend = yield* getResendClient();

  const formattedAmount = `$${(params.amount / 100).toFixed(2)}`;
  const downloadUrl = `${env.APP_URL}/download/${params.uploadId}`;
  const purchaseDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const result = yield* Effect.tryPromise({
    try: () =>
      resend.emails.send({
        from: getFromEmail(),
        to: params.email,
        subject: "Your BabyPeek HD photo is ready! 🎉",
        html: generateReceiptHtml({
          amount: formattedAmount,
          date: purchaseDate,
          downloadUrl,
          isGift: params.isGift,
          purchaseId: params.purchaseId,
        }),
      }),
    catch: (e) =>
      new EmailError({
        cause: "SEND_FAILED",
        message: String(e),
      }),
  }).pipe(
    Effect.retry({ times: 2, schedule: Schedule.exponential("500 millis") }),
    Effect.timeout("30 seconds"),
    Effect.catchTag("TimeoutException", () =>
      Effect.fail(new EmailError({ cause: "SEND_FAILED", message: "Email send timed out" })),
    ),
  );

  // H1 Fix: Log Resend message ID for debugging (Story 6.5 AC-5)
  yield* Effect.log(
    `Receipt email sent: messageId=${result.data?.id}, purchaseId=${params.purchaseId}`,
  );
});

/**
 * Generate download email HTML template (Story 7.4)
 * AC-2: Warm, celebratory tone
 * AC-3: Prominent download button
 * AC-4: 7-day expiration notice
 * AC-5: Consistent brand styling with receipt email
 */
export const generateDownloadHtml = (params: {
  downloadUrl: string;
  isGift: boolean;
  expiresInDays?: number;
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FDF8F5;">
  <div style="background-color: white; border-radius: 16px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    
    <!-- Header with baby emoji -->
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 48px;">👶</span>
    </div>
    
    <!-- Celebratory headline (AC-2) -->
    <h1 style="color: #E8927C; font-family: 'Playfair Display', Georgia, serif; font-size: 28px; margin-bottom: 8px; text-align: center;">
      ${params.isGift ? "Someone Gifted You a Special Photo! 🎁" : "Your HD Photo is Ready! 🎉"}
    </h1>
    
    <!-- Warm message (AC-2) -->
    <p style="color: #6B5B5B; font-size: 16px; line-height: 1.6; text-align: center; margin-bottom: 32px;">
      ${
        params.isGift
          ? "A loved one purchased the HD version of your baby portrait as a gift. It's waiting for you!"
          : "Your beautiful HD baby portrait is ready to download. We hope it brings you joy!"
      }
    </p>
    
    <!-- Prominent download button (AC-3) -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="${params.downloadUrl}" 
         style="display: inline-block; background-color: #E8927C; color: white; text-decoration: none; padding: 18px 40px; border-radius: 8px; font-weight: 600; font-size: 18px; box-shadow: 0 4px 12px rgba(232, 146, 124, 0.3);">
        Download HD Photo
      </a>
    </div>
    
    <!-- Expiration notice (AC-4) -->
    <div style="background-color: #FEF3CD; border-radius: 8px; padding: 12px 16px; margin-top: 24px; border-left: 4px solid #F0AD4E;">
      <p style="color: #856404; font-size: 14px; margin: 0;">
        ⏰ <strong>Important:</strong> This download link expires in ${params.expiresInDays ?? 7} days. 
        Save your photo before then!
      </p>
    </div>
    
    <!-- Tips section -->
    <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #EEE;">
      <p style="color: #9B8B8B; font-size: 13px; margin-bottom: 8px;">
        <strong>Tips for your photo:</strong>
      </p>
      <ul style="color: #9B8B8B; font-size: 13px; padding-left: 20px; margin: 0;">
        <li>Save it to your camera roll</li>
        <li>Print it for your nursery</li>
        <li>Share it with family & friends</li>
      </ul>
    </div>
    
    <!-- Footer -->
    <p style="color: #9B8B8B; font-size: 12px; text-align: center; margin-top: 24px;">
      Questions? Reply to this email and we'll help.
      <br><br>
      Made with 💕 by BabyPeek
    </p>
    
  </div>
</body>
</html>
`;

/**
 * Send download email with enhanced template (Story 7.4)
 * AC-1: Email sent via Resend after purchase complete
 */
const sendDownloadEmail = Effect.fn("ResendService.sendDownloadEmail")(function* (
  params: DownloadEmailParams,
) {
  const resend = yield* getResendClient();
  const isGift = params.isGift ?? false;

  const subject = isGift
    ? "🎁 Someone gifted you a special photo!"
    : "📸 Your HD photo is ready to download!";

  const result = yield* Effect.tryPromise({
    try: () =>
      resend.emails.send({
        from: getFromEmail(),
        to: params.email,
        subject,
        html: generateDownloadHtml({
          downloadUrl: params.downloadUrl,
          isGift,
          expiresInDays: 7,
        }),
      }),
    catch: (e) =>
      new EmailError({
        cause: "SEND_FAILED",
        message: String(e),
      }),
  }).pipe(
    Effect.retry({ times: 2, schedule: Schedule.exponential("500 millis") }),
    Effect.timeout("30 seconds"),
    Effect.catchTag("TimeoutException", () =>
      Effect.fail(new EmailError({ cause: "SEND_FAILED", message: "Email send timed out" })),
    ),
  );

  // Log Resend message ID for debugging (Story 7.4 AC-1)
  yield* Effect.log(
    `Download email sent: messageId=${result.data?.id}, uploadId=${params.uploadId}, isGift=${isGift}`,
  );

  // Story 7.4 Task 4: Track download_email_sent event in PostHog
  captureEvent("download_email_sent", params.uploadId, {
    upload_id: params.uploadId,
    is_gift: isGift,
    recipient_type: isGift ? "gift_recipient" : "purchaser",
    message_id: result.data?.id,
  });
});

/**
 * Generate gift confirmation email HTML (Story 6.7 - AC-4: warm, thank-you tone)
 * Sent to the gift purchaser
 */
const generateGiftConfirmationHtml = (params: {
  amount: string;
  date: string;
  purchaseId: string;
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FDF8F5;">
  <div style="background-color: white; border-radius: 16px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <h1 style="color: #E8927C; font-family: 'Playfair Display', Georgia, serif; font-size: 28px; margin-bottom: 8px; text-align: center;">
      Thank You for Your Gift! 🎁
    </h1>
    
    <p style="color: #6B5B5B; font-size: 16px; line-height: 1.6; text-align: center; margin-bottom: 24px;">
      Your thoughtful gift has been sent! The expecting parent will receive their HD photo shortly.
    </p>
    
    <!-- Gift Confirmation -->
    <div style="text-align: center; margin: 32px 0; padding: 24px; background-color: #FDF8F5; border-radius: 12px;">
      <p style="font-size: 48px; margin: 0;">💝</p>
      <p style="color: #6B5B5B; font-size: 18px; font-weight: 600; margin: 16px 0 8px 0;">
        Gift Delivered!
      </p>
      <p style="color: #9B8B8B; font-size: 14px; margin: 0;">
        The recipient will receive an email with their HD photo download link.
      </p>
    </div>
    
    <!-- Purchase Details -->
    <div style="background-color: #FDF8F5; border-radius: 8px; padding: 16px; margin-top: 24px;">
      <h2 style="color: #6B5B5B; font-size: 14px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;">
        Receipt Details
      </h2>
      <p style="color: #6B5B5B; font-size: 14px; margin: 4px 0;">
        <strong>Amount:</strong> ${params.amount}
      </p>
      <p style="color: #6B5B5B; font-size: 14px; margin: 4px 0;">
        <strong>Date:</strong> ${params.date}
      </p>
      <p style="color: #6B5B5B; font-size: 14px; margin: 4px 0;">
        <strong>Order ID:</strong> ${params.purchaseId}
      </p>
    </div>
    
    <!-- Footer -->
    <p style="color: #9B8B8B; font-size: 12px; text-align: center; margin-top: 24px;">
      Thank you for sharing the joy with BabyPeek! 💕
      <br>
      Questions? Reply to this email.
    </p>
    
  </div>
</body>
</html>
`;

/**
 * Generate gift notification email HTML (Story 6.7 - AC-3: celebratory, surprise tone)
 * Sent to the gift recipient (original uploader)
 */
const generateGiftNotificationHtml = (params: { downloadUrl: string }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FDF8F5;">
  <div style="background-color: white; border-radius: 16px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <h1 style="color: #E8927C; font-family: 'Playfair Display', Georgia, serif; font-size: 28px; margin-bottom: 8px; text-align: center;">
      Someone Special Gifted You! 🎉
    </h1>
    
    <p style="color: #6B5B5B; font-size: 16px; line-height: 1.6; text-align: center; margin-bottom: 24px;">
      A friend or family member just unlocked your HD baby portrait! Your beautiful creation is ready to download.
    </p>
    
    <!-- Gift Badge -->
    <div style="text-align: center; margin: 32px 0;">
      <p style="font-size: 64px; margin: 0;">🎁✨</p>
    </div>
    
    <!-- Download Button -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="${params.downloadUrl}" style="display: inline-block; background-color: #E8927C; color: white; text-decoration: none; padding: 18px 40px; border-radius: 8px; font-weight: 600; font-size: 18px;">
        Download Your HD Photo
      </a>
    </div>
    
    <!-- Message -->
    <div style="background-color: #FDF8F5; border-radius: 8px; padding: 16px; margin-top: 24px; text-align: center;">
      <p style="color: #6B5B5B; font-size: 14px; margin: 0;">
        This download link is active for <strong>30 days</strong>.
        <br>
        Save it to your device to keep forever! 📱
      </p>
    </div>
    
    <!-- Footer -->
    <p style="color: #9B8B8B; font-size: 12px; text-align: center; margin-top: 24px;">
      Enjoy your gift! 💕
      <br>
      Questions? Reply to this email.
    </p>
    
  </div>
</body>
</html>
`;

/**
 * Send gift confirmation email to purchaser (Story 6.7 - AC-4)
 */
const sendGiftConfirmationEmail = Effect.fn("ResendService.sendGiftConfirmationEmail")(function* (
  params: GiftConfirmationParams,
) {
  const resend = yield* getResendClient();

  const formattedAmount = `$${(params.amount / 100).toFixed(2)}`;
  const purchaseDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const result = yield* Effect.tryPromise({
    try: () =>
      resend.emails.send({
        from: getFromEmail(),
        to: params.email,
        subject: "Thank You for Your Gift! 🎁",
        html: generateGiftConfirmationHtml({
          amount: formattedAmount,
          date: purchaseDate,
          purchaseId: params.purchaseId,
        }),
      }),
    catch: (e) =>
      new EmailError({
        cause: "SEND_FAILED",
        message: String(e),
      }),
  }).pipe(
    Effect.retry({ times: 2, schedule: Schedule.exponential("500 millis") }),
    Effect.timeout("30 seconds"),
    Effect.catchTag("TimeoutException", () =>
      Effect.fail(new EmailError({ cause: "SEND_FAILED", message: "Email send timed out" })),
    ),
  );

  // Log Resend message ID for debugging
  yield* Effect.log(
    `Gift confirmation email sent: messageId=${result.data?.id}, purchaseId=${params.purchaseId}`,
  );
});

/**
 * Send gift notification email to recipient (Story 6.7 - AC-3)
 */
const sendGiftNotificationEmail = Effect.fn("ResendService.sendGiftNotificationEmail")(function* (
  params: GiftNotificationParams,
) {
  const resend = yield* getResendClient();

  const result = yield* Effect.tryPromise({
    try: () =>
      resend.emails.send({
        from: getFromEmail(),
        to: params.email,
        subject: "Someone Special Gifted You! 🎉",
        html: generateGiftNotificationHtml({
          downloadUrl: params.downloadUrl,
        }),
      }),
    catch: (e) =>
      new EmailError({
        cause: "SEND_FAILED",
        message: String(e),
      }),
  }).pipe(
    Effect.retry({ times: 2, schedule: Schedule.exponential("500 millis") }),
    Effect.timeout("30 seconds"),
    Effect.catchTag("TimeoutException", () =>
      Effect.fail(new EmailError({ cause: "SEND_FAILED", message: "Email send timed out" })),
    ),
  );

  // Log Resend message ID for debugging
  yield* Effect.log(
    `Gift notification email sent: messageId=${result.data?.id}, uploadId=${params.uploadId}`,
  );
});

/**
 * Style labels for email display
 */
const STYLE_LABELS: Record<string, string> = {
  v3: "Style A - Classic",
  "v3-json": "Style B - Soft",
  v4: "Style C - Detailed",
  "v4-json": "Style D - Artistic",
};

/**
 * Generate HD download email HTML with all 4 variants
 * Shows preview thumbnails with download buttons for each style
 */
export const generateHDDownloadHtml = (params: {
  amount: string;
  date: string;
  purchaseId: string;
  isGift: boolean;
  variants: Array<{
    downloadUrl: string;
    previewUrl: string;
    promptVersion: string;
    variantIndex: number;
  }>;
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FDF8F5;">
  <div style="background-color: white; border-radius: 16px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 48px;">👶✨</span>
    </div>
    
    <h1 style="color: #E8927C; font-family: 'Playfair Display', Georgia, serif; font-size: 28px; margin-bottom: 8px; text-align: center;">
      ${params.isGift ? "Your Gift is Ready! 🎁" : "Your HD Photos Are Ready! 🎉"}
    </h1>
    
    <p style="color: #6B5B5B; font-size: 16px; line-height: 1.6; text-align: center; margin-bottom: 32px;">
      ${
        params.isGift
          ? "Someone special unlocked your HD baby portraits! All 4 beautiful styles are now available to download."
          : "Thank you for your purchase! All 4 HD portrait styles are ready - download your favorites below."
      }
    </p>
    
    <!-- All 4 Variants Grid -->
    <div style="margin: 24px 0;">
      <h2 style="color: #6B5B5B; font-size: 16px; text-align: center; margin-bottom: 16px;">
        Your Portrait Collection
      </h2>
      
      <!-- 2x2 Grid of variants -->
      <table cellpadding="0" cellspacing="8" border="0" width="100%">
        <tr>
          ${params.variants
            .slice(0, 2)
            .map(
              (v) => `
            <td width="50%" valign="top" style="text-align: center; padding: 8px;">
              <div style="background: #FDF8F5; border-radius: 12px; padding: 12px;">
                <img src="${v.previewUrl}" alt="${STYLE_LABELS[v.promptVersion] || `Style ${v.variantIndex}`}" 
                     style="width: 100%; max-width: 200px; border-radius: 8px; margin-bottom: 12px;">
                <p style="color: #6B5B5B; font-size: 12px; margin: 0 0 8px 0; font-weight: 600;">
                  ${STYLE_LABELS[v.promptVersion] || `Style ${v.variantIndex}`}
                </p>
                <a href="${v.downloadUrl}" 
                   style="display: inline-block; background-color: #E8927C; color: white; text-decoration: none; padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 600;">
                  Download HD
                </a>
              </div>
            </td>
          `,
            )
            .join("")}
        </tr>
        <tr>
          ${params.variants
            .slice(2, 4)
            .map(
              (v) => `
            <td width="50%" valign="top" style="text-align: center; padding: 8px;">
              <div style="background: #FDF8F5; border-radius: 12px; padding: 12px;">
                <img src="${v.previewUrl}" alt="${STYLE_LABELS[v.promptVersion] || `Style ${v.variantIndex}`}" 
                     style="width: 100%; max-width: 200px; border-radius: 8px; margin-bottom: 12px;">
                <p style="color: #6B5B5B; font-size: 12px; margin: 0 0 8px 0; font-weight: 600;">
                  ${STYLE_LABELS[v.promptVersion] || `Style ${v.variantIndex}`}
                </p>
                <a href="${v.downloadUrl}" 
                   style="display: inline-block; background-color: #E8927C; color: white; text-decoration: none; padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 600;">
                  Download HD
                </a>
              </div>
            </td>
          `,
            )
            .join("")}
        </tr>
      </table>
    </div>
    
    <!-- Tips -->
    <div style="background-color: #E8F5E9; border-radius: 8px; padding: 16px; margin-top: 24px;">
      <p style="color: #2E7D32; font-size: 14px; margin: 0;">
        💡 <strong>Tip:</strong> Download all 4 styles - each one captures a unique personality!
      </p>
    </div>
    
    <!-- Purchase Details -->
    <div style="background-color: #FDF8F5; border-radius: 8px; padding: 16px; margin-top: 24px;">
      <p style="color: #6B5B5B; font-size: 14px; margin: 4px 0;">
        <strong>Amount:</strong> ${params.amount}
      </p>
      <p style="color: #6B5B5B; font-size: 14px; margin: 4px 0;">
        <strong>Date:</strong> ${params.date}
      </p>
      <p style="color: #6B5B5B; font-size: 14px; margin: 4px 0;">
        <strong>Order ID:</strong> ${params.purchaseId}
      </p>
    </div>
    
    <!-- Expiration Notice -->
    <div style="background-color: #FEF3CD; border-radius: 8px; padding: 12px 16px; margin-top: 16px; border-left: 4px solid #F0AD4E;">
      <p style="color: #856404; font-size: 14px; margin: 0;">
        ⏰ <strong>Important:</strong> Download links expire in 30 days. Save your favorites now!
      </p>
    </div>
    
    <!-- Footer -->
    <p style="color: #9B8B8B; font-size: 12px; text-align: center; margin-top: 24px;">
      We'd love to see your nursery photos! Tag us @babypeek 📸
      <br><br>
      Questions? Reply to this email.
      <br>
      Made with 💕 by BabyPeek
    </p>
    
  </div>
</body>
</html>
`;

/**
 * Send HD download email with all 4 variants after purchase
 * Includes preview thumbnails and individual download links for each style
 */
const sendHDDownloadEmail = Effect.fn("ResendService.sendHDDownloadEmail")(function* (
  params: HDDownloadEmailParams,
) {
  const resend = yield* getResendClient();

  const formattedAmount = `$${(params.amount / 100).toFixed(2)}`;
  const purchaseDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const subject = params.isGift
    ? "🎁 Your gifted HD portraits are ready!"
    : "📸 Your HD Baby Portraits Are Ready!";

  const result = yield* Effect.tryPromise({
    try: () =>
      resend.emails.send({
        from: getFromEmail(),
        to: params.email,
        subject,
        html: generateHDDownloadHtml({
          amount: formattedAmount,
          date: purchaseDate,
          purchaseId: params.purchaseId,
          isGift: params.isGift,
          variants: params.variants,
        }),
      }),
    catch: (e) =>
      new EmailError({
        cause: "SEND_FAILED",
        message: String(e),
      }),
  }).pipe(
    Effect.retry({ times: 2, schedule: Schedule.exponential("500 millis") }),
    Effect.timeout("30 seconds"),
    Effect.catchTag("TimeoutException", () =>
      Effect.fail(new EmailError({ cause: "SEND_FAILED", message: "Email send timed out" })),
    ),
  );

  // Log for debugging
  yield* Effect.log(
    `HD download email sent: messageId=${result.data?.id}, purchaseId=${params.purchaseId}, variants=${params.variants.length}`,
  );

  // Track email sent
  captureEvent("hd_download_email_sent", params.uploadId, {
    upload_id: params.uploadId,
    purchase_id: params.purchaseId,
    is_gift: params.isGift,
    variant_count: params.variants.length,
    message_id: result.data?.id,
  });
});

// Resend Service implementation
export const ResendServiceLive = Layer.succeed(ResendService, {
  sendResultEmail,
  sendReceiptEmail,
  sendDownloadEmail,
  sendHDDownloadEmail,
  sendGiftConfirmationEmail,
  sendGiftNotificationEmail,
});
