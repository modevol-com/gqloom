import { URL, fileURLToPath } from "node:url"
import { transformerTwoslash } from "@shikijs/vitepress-twoslash"
import tailwindcss from "@tailwindcss/vite"
import { type DefaultTheme, defineConfig } from "vitepress"

const sidebarZh = [
  {
    text: "介绍",
    link: "/zh/docs/",
  },
  {
    text: "快速上手",
    link: "/zh/docs/getting-started",
  },
  {
    text: "丝线（Silk）",
    link: "/zh/docs/silk",
  },
  {
    text: "解析器（Resolver）",
    link: "/zh/docs/resolver",
  },
  {
    text: "编织（Weave）",
    link: "/zh/docs/weave",
  },
] satisfies DefaultTheme.Config["sidebar"]

const sidebarEn = [
  {
    text: "Introduction",
    link: "/docs/",
  },
  {
    text: "Getting Started",
    link: "/docs/getting-started",
  },
  {
    text: "Silk",
    link: "/docs/silk",
  },
  {
    text: "Resolver",
    link: "/docs/resolver",
  },
  {
    text: "Weave",
    link: "/docs/weave",
  },
] satisfies DefaultTheme.Config["sidebar"]

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
        nav: [
          { text: "主页", link: "/zh" },
          { text: "文档", link: "/zh/docs/" },
        ],
        sidebar: sidebarZh,
        outlineTitle: "本页内容",
      },
    },
  },
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
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
