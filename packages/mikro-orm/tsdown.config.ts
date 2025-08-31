import { defineConfig } from "tsdown"

export default defineConfig({
  entry: ["./src/index.ts"],
  format: ["esm", "cjs"],
  minify: false,
  dts: true,
  outDir: "./dist",
  clean: true,
  tsconfig: "../../tsconfig.json",
})
