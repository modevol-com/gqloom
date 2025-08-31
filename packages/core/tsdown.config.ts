import { defineConfig } from "tsdown"

export default defineConfig({
  entry: {
    index: "./src/index.ts",
    context: "./src/context/index.ts",
  },
  format: ["esm", "cjs"],
  minify: false,
  dts: true,
  outDir: "./dist",
  clean: true,
  external: ["node:async_hooks"],
  tsconfig: "../../tsconfig.json",
})
