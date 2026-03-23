import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/processing/$jobId")({
  validateSearch: z.object({
    prompts: z.boolean().optional(),
    promptVersion: z.enum(["v3", "v3-json", "v4", "v4-json"]).optional(),
  }),
});
