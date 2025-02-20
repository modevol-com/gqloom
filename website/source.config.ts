import { rehypeCodeDefaultOptions } from "fumadocs-core/mdx-plugins"
import {
  defineCollections,
  defineConfig,
  defineDocs,
} from "fumadocs-mdx/config"
import { transformerTwoslash } from "fumadocs-twoslash"

export const { docs, meta } = defineDocs({
  dir: "content/docs",
})

export const home = defineCollections({
  type: "doc",
  dir: "content/home",
})

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      transformers: [
        ...(rehypeCodeDefaultOptions.transformers ?? []),
        process.env.NODE_ENV === "production" && transformerTwoslash(),
      ].filter(notFalse),
    },
  },
})

function notFalse<T>(value: T | false): value is T {
  return value !== false
}
