import { URL, fileURLToPath } from "node:url"
import { transformerTwoslash } from "@shikijs/vitepress-twoslash"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vitepress"
import sidebarEn from "./sidebar-en.mjs"
import sidebarZh from "./sidebar-zh.mjs"

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "GQLoom",
  description:
    "GQLoom is a Code First GraphQL Schema Loom used to weave runtime types in the TypeScript/JavaScript ecosystem into a GraphQL Schema.",
  head: [["link", { rel: "icon", href: "/gqloom.svg" }]],
  locales: {
    root: {
      label: "English",
      lang: "en",
    },
    zh: {
      label: "简体中文",
      lang: "zh",
      themeConfig: {
        nav: [
          { text: "主页", link: "/zh" },
          { text: "文档", link: "/zh/docs/" },
        ],
        sidebar: sidebarZh,
        docFooter: {
          prev: "上一篇",
          next: "下一篇",
        },
        outlineTitle: "本页内容",
      },
    },
  },
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config,
    logo: "/gqloom.svg",
    nav: [
      { text: "Home", link: "/" },
      { text: "Documents", link: "/docs/" },
    ],

    sidebar: sidebarEn,
    socialLinks: [
      { icon: "github", link: "https://github.com/modevol-com/gqloom" },
    ],
    outline: {
      level: [2, 3],
    },
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
