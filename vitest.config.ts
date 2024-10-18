import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        "**/examples/**/*",
        "**/*.spec-d.ts",
        "**/draft/**",
        "website/**",
        "vitest.workspace.ts",
        "**/generated/*.ts",
        "**/bin/*",
      ],
    },
  },
})
