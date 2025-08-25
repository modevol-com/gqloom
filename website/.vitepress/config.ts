import { URL, fileURLToPath } from "node:url"
import { transformerTwoslash } from "@shikijs/vitepress-twoslash"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vitepress"

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
        // sidebar: sidebarZh,
        docFooter: {
          prev: "上一篇",
          next: "下一篇",
        },
        outlineTitle: "目录",
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
    search: {
      provider: "local",
      options: {
        locales: {
          zh: {
            translations: {
              button: {
                buttonText: "搜索文档",
                buttonAriaLabel: "搜索文档",
              },
              modal: {
                noResultsText: "无法找到相关结果",
                resetButtonTitle: "清除查询条件",
                footer: {
                  selectText: "选择",
                  navigateText: "切换",
                },
              },
            },
          },
        },
      },
    },
    // sidebar: sidebarEn,
    socialLinks: [
      { icon: "github", link: "https://github.com/modevol-com/gqloom" },
    ],
    outline: {
      level: [2, 3],
    },
  },
  markdown: {
    codeTransformers: [transformerTwoslash()],
    languages: ["ts", "js", "bash"],
  },
  ignoreDeadLinks: [/^https?:\/\/localhost/],
  srcExclude: ["snippets/"],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("../", import.meta.url)),
      },
    },
  },
})
