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
      alias("json"),
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
        ".vercel/",
        "coverage/",
        "**/test/**",
        "**/dist/**",
        "**/examples/**/*",
        "**/*.spec-d.ts",
        "**/*.spec.ts",
        "**/*.config.ts",
        "**/draft/**",
        "website/**",
        "vitest.workspace.ts",
        "**/generated/*.ts",
        "**/bin/*",
        "packages/prisma/src/generator/index.ts",
        "packages/mikro-orm/src/entity-schema.ts",
      ],
    },
  },
})
