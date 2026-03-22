import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/for-clinics")({
  component: () => <Outlet />,
});
