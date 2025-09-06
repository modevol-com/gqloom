import { defineConfig } from "tsdown"

export default defineConfig({
  entry: ["./src/index.ts", "./src/context.ts"],
  format: ["esm", "cjs"],
  minify: false,
  dts: true,
  outDir: "./dist",
  clean: true,
  tsconfig: "../../tsconfig.json",
  external: ["@gqloom/core"],
})
