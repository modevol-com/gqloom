import * as path from "path"
import { defineConfig, defineProject } from "vitest/config"

const alias = (name: string) => {
  const find = `@gqloom/${name}`
  const replacement = path.join(__dirname, "packages", name, "src")
  return { find, replacement }
}

export const projectConfig = defineProject({
  test: {
    alias: [
      alias("core"),
      alias("federation"),
      alias("mikro-orm"),
      alias("prisma"),
      alias("valibot"),
      alias("yup"),
      alias("zod"),
    ],
  },
})

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        "coverage/",
        "**/dist/**",
        "**/examples/**/*",
        "**/*.spec-d.ts",
        "**/*.spec.ts",
        "**/vitest.config.ts",
        "**/draft/**",
        "website/**",
        "vitest.workspace.ts",
        "**/generated/*.ts",
        "**/bin/*",
      ],
    },
  },
})
