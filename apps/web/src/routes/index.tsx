import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { api } from "@/lib/api"

export const Route = createFileRoute("/")({
  component: HomeComponent,
})

function HomeComponent() {
  const healthCheck = useQuery({
    queryKey: ["health"],
    queryFn: () => api.health(),
    refetchInterval: 30000, // Check every 30s
  })

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">3d-ultra</h1>
        <p className="text-xl text-muted-foreground">
          Transform your 4D ultrasound into a beautiful portrait
        </p>
      </div>

      <div className="grid gap-6">
        <section className="rounded-lg border p-4">
          <h2 className="mb-2 font-medium">API Status</h2>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                healthCheck.data?.status === "ok"
                  ? "bg-green-500"
                  : healthCheck.isLoading
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }`}
            />
            <span className="text-muted-foreground text-sm">
              {healthCheck.isLoading
                ? "Checking..."
                : healthCheck.data?.status === "ok"
                  ? "Connected"
                  : "Disconnected"}
            </span>
          </div>
        </section>

        <section className="rounded-lg border p-6 text-center">
          <h2 className="text-lg font-medium mb-4">Ready to build!</h2>
          <p className="text-muted-foreground">
            Epic 1 foundation is complete. Next: Epic 2 (Landing) or Story 1.2 (Neon DB).
          </p>
        </section>
      </div>
    </div>
  )
}
