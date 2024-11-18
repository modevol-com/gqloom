import { defineConfig } from "vitest/config"
import * as path from "path"

export default defineConfig({
  test: {
    alias: {
      "@gqloom/core": path.resolve(__dirname, "./packages/core/src/index.ts"),
    },
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
