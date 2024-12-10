import { defineWorkspace } from "vitest/config"

export default defineWorkspace([
  "packages/*",
  {
    extends: "./vitest.config.ts",
    test: {
      include: ["test/**/*.{spec,spec-d}.ts", "src/**/*.{spec,spec-d}.ts"],
    },
  },
])
