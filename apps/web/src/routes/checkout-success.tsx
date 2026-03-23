import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/checkout-success")({
  validateSearch: (search: Record<string, unknown>) => ({
    session_id: search.session_id as string | undefined,
  }),
});
