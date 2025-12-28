import { Hono } from "hono";

const app = new Hono();

// Health check endpoint
app.get("/", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Ready check (verifies dependencies)
app.get("/ready", async (c) => {
  // TODO: Add database ping when configured
  const checks = {
    api: true,
    database: true, // Will verify with actual ping later
  };

  const allHealthy = Object.values(checks).every(Boolean);

  return c.json(
    {
      status: allHealthy ? "ready" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    },
    allHealthy ? 200 : 503,
  );
});

export default app;
