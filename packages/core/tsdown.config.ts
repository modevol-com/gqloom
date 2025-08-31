import { defineConfig } from "tsdown"

export default defineConfig({
  entry: {
    index: "./src/index.ts",
    context: "./src/context/index.ts",
  },
  format: ["esm", "cjs"],
  minify: false,
  dts: {
    resolve: ["@standard-schema/spec"],
  },
  outDir: "./dist",
  clean: true,
  external: ["node:async_hooks"],
  noExternal: ["@standard-schema/spec"],
  tsconfig: "../../tsconfig.json",
})
