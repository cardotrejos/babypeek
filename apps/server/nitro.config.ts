// @ts-nocheck - nitro v3 alpha types
import { defineConfig } from "nitro"

export default defineConfig({
  modules: ["workflow/nitro"],
  routes: {
    "/**": "./src/index.ts",
  },
  preset: "vercel",
  // Externalize sharp to avoid bundling native binaries
  externals: {
    external: ["sharp"],
  },
})
