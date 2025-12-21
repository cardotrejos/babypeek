import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/**",
        "**/dist/**",
        "**/*.config.*",
        "**/test/**",
        "**/*.d.ts",
        "_bmad/**",
        "_bmad-output/**",
        ".agent/**",
        ".cursor/**",
        ".github/**",
      ],
    },
  },
})
