import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/result/$resultId")({
  validateSearch: (search: Record<string, unknown>) => ({
    cancelled: search.cancelled === "true" ? "true" : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
  }),
});
