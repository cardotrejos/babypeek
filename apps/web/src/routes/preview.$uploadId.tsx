import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/preview/$uploadId")({
  validateSearch: (search: Record<string, unknown>) => ({
    cancelled: search.cancelled === "true" ? "true" : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
  }),
});
