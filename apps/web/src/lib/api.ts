// Simple fetch-based API client for babypeek
// Will be enhanced with Hono RPC types as we build features

import { API_BASE_URL } from "./api-config";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
};

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// API methods
export const api = {
  // Health check
  health: () => request<{ status: string; timestamp: string }>("/api/health"),

  // More endpoints will be added as we implement features
};

export type Api = typeof api;
