import * as path from "path"
import { defineConfig, defineProject } from "vitest/config"

const alias = (name: string) => {
  const find = `@gqloom/${name}`
  const replacement = path.join(__dirname, "packages", name, "src")
  return { find, replacement }
}

const graphqlPath = path.join(__dirname, "node_modules", "graphql", "index.js")

export const dedupeGraphqlConfig = defineProject({
  resolve: { dedupe: ["graphql"] },
  test: {
    deps: { optimizer: { ssr: { include: ["graphql"] } } },
    alias: [
      { find: "graphql", replacement: graphqlPath },
      { find: "graphql/index.js", replacement: graphqlPath },
      { find: "graphql/index.mjs", replacement: graphqlPath },
    ],
  },
})

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
    include: ["test/**/*.{spec,spec-d}.ts", "src/**/*.{spec,spec-d}.ts"],
  },
})

export default defineConfig({
  test: {
    projects: ["packages/*", "examples/query-complexity", projectConfig],
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
