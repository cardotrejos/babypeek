import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-vite-plugin";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Plugin to replace %VITE_*% placeholders in index.html
 * This enables injecting environment variables into the HTML at build time
 */
function htmlEnvPlugin(): Plugin {
  return {
    name: "html-env-plugin",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        // Replace %VITE_*% placeholders with actual values
        return html.replace(/%VITE_(\w+)%/g, (_match, key) => {
          const envKey = `VITE_${key}`;
          const value = process.env[envKey] ?? "";
          return value;
        });
      },
    },
  };
}

export default defineConfig({
  plugins: [htmlEnvPlugin(), tsconfigPaths(), tailwindcss(), TanStackRouterVite(), viteReact()],
  server: {
    port: 3001,
  },
});
