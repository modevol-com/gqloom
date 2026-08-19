import { defineConfig } from "tsdown"

export default defineConfig({
  entry: {
    index: "./src/index.ts",
    context: "./src/context/index.ts",
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
  dts: {
    resolve: ["@standard-schema/spec"],
  },
  outDir: "./dist",
  clean: true,
  external: ["node:async_hooks"],
  noExternal: ["@standard-schema/spec"],
  tsconfig: "../../tsconfig.json",
})
