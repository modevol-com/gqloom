import { rehypeCodeDefaultOptions } from "fumadocs-core/mdx-plugins"
import { remarkInstall } from "fumadocs-docgen"
import {
  defineCollections,
  defineConfig,
  defineDocs,
} from "fumadocs-mdx/config"
import { transformerTwoslash } from "fumadocs-twoslash"
import { createFileSystemTypesCache } from "fumadocs-twoslash/cache-fs"

export const { docs, meta } = defineDocs({
  dir: "content/docs",
})

export const home = defineCollections({
  type: "doc",
  dir: "content/home",
})

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkInstall],
    rehypeCodeOptions: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      transformers: [
        ...(rehypeCodeDefaultOptions.transformers ?? []),
        process.env.NODE_ENV === "production" &&
          transformerTwoslash({ typesCache: createFileSystemTypesCache() }),
      ].filter(notFalse),
    },
  },
})

function notFalse<T>(value: T | false): value is T {
  return value !== false
}
