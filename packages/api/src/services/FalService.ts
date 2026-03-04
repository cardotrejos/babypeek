import { config, subscribe } from "@fal-ai/serverless-client";
import { Context, Effect, Layer } from "effect";

import { env } from "../lib/env";

let isConfigured = false;

function ensureConfig(): void {
  if (isConfigured) return;
  if (!env.FAL_KEY) throw new Error("FAL_KEY is required");
  config({ credentials: env.FAL_KEY });
  isConfigured = true;
}

export interface FalGeneratedImage {
  url: string;
  mimeType: string;
}

interface FalImagePayload {
  images?: Array<{
    url?: string;
    content_type?: string;
  }>;
}

export class FalService extends Context.Tag("FalService")<
  FalService,
  {
    generateImageFromUrl: (
      imageUrl: string,
      prompt: string,
      model: string,
    ) => Effect.Effect<FalGeneratedImage, Error>;
  }
>() {}

export const FalServiceLive = Layer.succeed(FalService, {
  generateImageFromUrl: (imageUrl: string, prompt: string, model: string) =>
    Effect.tryPromise({
      try: async () => {
        ensureConfig();

        const response = await subscribe(model, {
          input: {
            prompt,
            image_url: imageUrl,
          },
          logs: false,
        });

        const payload =
          typeof response === "object" && response !== null && "data" in response
            ? ((response as { data?: FalImagePayload }).data ?? {})
            : (response as FalImagePayload);

        const image = payload.images?.[0];
        if (!image?.url) {
          throw new Error(`No image returned from fal.ai model: ${model}`);
        }

        return {
          url: image.url,
          mimeType: image.content_type || "image/jpeg",
        };
      },
      catch: (error) => (error instanceof Error ? error : new Error(String(error))),
    }),
});
