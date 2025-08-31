import { defineConfig } from "tsdown"

export default defineConfig({
  entry: {
    index: "./src/index.ts",
    v3: "./src/v3/index.ts",
  },
  format: ["esm", "cjs"],
  minify: false,
  dts: true,
  outDir: "./dist",
  clean: true,
  tsconfig: "../../tsconfig.json",
})
