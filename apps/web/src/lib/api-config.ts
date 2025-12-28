// Centralized API URL configuration
// VITE_SERVER_URL should be set in Vercel to https://api.babypeek.io
// Fallbacks:
// - VITE_API_URL: legacy env used in some routes
// - empty string: same-origin (local dev / proxies)
export const API_BASE_URL = import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_API_URL || "";
