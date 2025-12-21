// app.config.ts
import { defineConfig } from "@tanstack/react-start/config";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
var app_config_default = defineConfig({
  server: {
    preset: "vercel"
  },
  vite: {
    plugins: [tsconfigPaths(), tailwindcss()]
  }
});
export {
  app_config_default as default
};
