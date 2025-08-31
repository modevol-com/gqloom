import { defineConfig } from "tsdown"

export default defineConfig({
  entry: {
    index: "./src/index.ts",
    context: "./src/context.ts",
  },
  format: ["esm", "cjs"],
  minify: false,
  dts: true,
  outDir: "./dist",
  clean: true,
  tsconfig: "../../tsconfig.json",
  external: ["@gqloom/core"],
})
