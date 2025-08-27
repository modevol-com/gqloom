import { URL, fileURLToPath } from "node:url"
import { transformerTwoslash } from "@shikijs/vitepress-twoslash"
import { createFileSystemTypesCache } from "@shikijs/vitepress-twoslash/cache-fs"
import tailwindcss from "@tailwindcss/vite"
import vueJsx from "@vitejs/plugin-vue-jsx"
import { defineConfig } from "vitepress"
import {
  groupIconMdPlugin,
  groupIconVitePlugin,
} from "vitepress-plugin-group-icons"
import llmstxt from "vitepress-plugin-llms"
import sidebarEn from "./sidebar-en"
import sidebarZh from "./sidebar-zh"

// https://vitepress.dev/reference/site-config
export default defineConfig({
  markdown: {
    codeTransformers: [
      transformerTwoslash({
        typesCache: createFileSystemTypesCache(),
      }),
    ],
    languages: ["ts", "js", "bash"],
    config(md) {
      md.use(groupIconMdPlugin)
    },
  },
  vite: {
    plugins: [
      tailwindcss(),
      vueJsx(),
      groupIconVitePlugin(),
      llmstxt({ ignoreFiles: ["zh/**/*"] }),
    ],
    resolve: {
      alias: [
        {
          find: "@",
          replacement: fileURLToPath(new URL("../", import.meta.url)),
        },
        {
          find: /^.*\/VPNavBarTitle\.vue$/,
          replacement: fileURLToPath(
            new URL("./theme/VPNavBarTitle.jsx", import.meta.url)
          ),
        },
      ],
    },
  },
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
    sidebar: sidebarEn,
    socialLinks: [
      { icon: "github", link: "https://github.com/modevol-com/gqloom" },
    ],
    outline: {
      level: [2, 3],
    },
  },
  ignoreDeadLinks: [/^https?:\/\/localhost/],
  srcExclude: ["snippets/"],
})
