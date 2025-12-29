import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import {
  healthRoutes,
  storageRoutes,
  uploadRoutes,
  processWorkflowRoutes,
  statusRoutes,
  retryRoutes,
  checkoutRoutes,
  webhookRoutes,
  shareRoutes,
  downloadRoutes,
  dataRoutes,
  cleanupRoutes,
  preferencesRoutes,
  previewRoutes,
} from "@babypeek/api";

const app = new Hono();

// Middleware
app.use(logger());
app.use(
  "/*",
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3001",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "X-Session-Token"],
  }),
);

// Routes
app.route("/api/health", healthRoutes);
app.route("/api/storage", storageRoutes);
app.route("/api/upload", uploadRoutes);
app.route("/api/process", processWorkflowRoutes);
app.route("/api/status", statusRoutes);
app.route("/api/retry", retryRoutes);
app.route("/api/checkout", checkoutRoutes);
app.route("/api/webhook", webhookRoutes);
app.route("/api/share", shareRoutes);
app.route("/api/download", downloadRoutes);
app.route("/api/data", dataRoutes);
app.route("/api/cron/cleanup", cleanupRoutes);
app.route("/api/preferences", preferencesRoutes);
app.route("/api/preview", previewRoutes);

// Root endpoint
app.get("/", (c) => {
  return c.json({
    name: "babypeek API",
    version: "1.0.0",
    status: "running",
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: "Not Found" }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error("Server error:", err);
  return c.json(
    {
      error: "Internal Server Error",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    },
    500,
  );
});

export default app;
