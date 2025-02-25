import { URL, fileURLToPath } from "node:url"
import { transformerTwoslash } from "@shikijs/vitepress-twoslash"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vitepress"

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "GQLoom",
  description:
    "GQLoom is a Code First GraphQL Schema Loom used to weave runtime types in the TypeScript/JavaScript ecosystem into a GraphQL Schema.",
  locales: {
    root: {
      label: "English",
      lang: "en",
    },
    zh: {
      label: "简体中文",
      lang: "zh",
      themeConfig: {
        nav: [{ text: "主页", link: "/" }],
        sidebar: [
          {
            text: "介绍",
            link: "/zh/docs/",
          },
          {
            text: "快速上手",
            link: "/docs/getting-started",
          },
        ],
        outlineTitle: "本页内容",
      },
    },
  },
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [{ text: "Home", link: "/" }],

    sidebar: [
      {
        text: "Introduction",
        link: "/docs/",
      },
      {
        text: "Getting Started",
        link: "/docs/getting-started",
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/modevol-com/gqloom" },
    ],
  },
  markdown: {
    codeTransformers: [transformerTwoslash() as any],
    languages: ["ts"] as any,
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("../", import.meta.url)),
      },
    },
  },
})
