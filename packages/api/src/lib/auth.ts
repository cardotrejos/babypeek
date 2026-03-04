import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { Resend } from "resend";

import { db } from "@babypeek/db";
import { env } from "./env";

const MAGIC_LINK_EXPIRATION_SECONDS = 5 * 60;
const DEV_AUTH_BASE_URL = "http://localhost:3000";
const resendClient = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  secret: (() => {
    if (!env.BETTER_AUTH_SECRET) {
      if (env.NODE_ENV === "production") throw new Error("BETTER_AUTH_SECRET is required in production");
      return "dev-secret-change-me-not-for-production";
    }
    return env.BETTER_AUTH_SECRET;
  })(),
  baseURL: (() => {
    if (!env.BETTER_AUTH_URL) {
      if (env.NODE_ENV === "production") {
        throw new Error(
          "BETTER_AUTH_URL is required in production (must point to the API server, not the web app)"
        );
      }
      // In development, Better Auth must point to the API server where /api/auth/* is mounted.
      return DEV_AUTH_BASE_URL;
    }
    return env.BETTER_AUTH_URL;
  })(),
  trustedOrigins: [env.WEB_URL || env.CORS_ORIGIN || "http://localhost:3001"],
  emailAndPassword: {
    enabled: false,
  },
  plugins: [
    magicLink({
      expiresIn: MAGIC_LINK_EXPIRATION_SECONDS,
      sendMagicLink: async ({ email, url }) => {
        if (!resendClient) {
          throw new Error("RESEND_API_KEY is required for magic links");
        }

        await resendClient.emails.send({
          from: "BabyPeek <noreply@babypeek.io>",
          to: email,
          subject: "Your BabyPeek Magic Link",
          html: (() => {
            // Escape the URL to prevent HTML injection via crafted redirect params
            const safeUrl = url.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            return `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
              <h2>Almost there!</h2>
              <p>Click below to continue with your baby portrait:</p>
              <a href="${safeUrl}" style="display: inline-block; padding: 12px 24px; background: #f97362; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 700;">
                Continue to BabyPeek
              </a>
              <p style="color: #666; font-size: 14px; margin-top: 16px;">
                This link expires in 5 minutes.
              </p>
            </div>
          `;
          })(),
        });
      },
    }),
  ],
});
