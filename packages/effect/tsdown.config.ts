import { defineConfig } from "tsdown"

export default defineConfig({
  entry: {
    index: "./src/index.ts",
  },
  format: ["esm", "cjs"],
  outExtensions: ({ format }) => {
    switch (format) {
      case "es":
        return { js: ".js", dts: ".d.ts" }
      case "cjs":
        return { js: ".cjs", dts: ".d.cts" }
    }
  },
  minify: false,
  dts: true,
  outDir: "./dist",
  clean: true,
  tsconfig: "../../tsconfig.json",
  external: ["@gqloom/core"],
})
