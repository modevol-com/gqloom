import { defineConfig } from "rspress/config"
import {
  createTransformerDiff,
  createTransformerHighlight,
  pluginShiki,
} from "@rspress/plugin-shiki"
import * as path from "path"

export default defineConfig({
  // 文档根目录
  root: "docs",
  title: "GQLoom",
  lang: "zh",
  logo: { dark: "/gqloom-name.svg", light: "/gqloom-name-light.svg" },
  icon: "/gqloom.svg",
  globalStyles: path.join(__dirname, "styles/index.css"),
  locales: [
    {
      lang: "en",
      label: "English",
      title: "GQLoom",
      description: "GraphQL Loom",
    },
    {
      lang: "zh",
      label: "简体中文",
      title: "GQLoom",
      description: "GraphQL 纺织机",
    },
  ],
  themeConfig: {
    socialLinks: [
      {
        icon: "github",
        mode: "link",
        content: "https://github.com/modevol-com/gqloom",
      },
    ],
    enableContentAnimation: true,
    locales: [
      {
        label: "English",
        description: "GraphQL Loom",
        lang: "en",
      },
      {
        label: "简体中文",
        description: "GraphQL 织布机",
        lang: "zh",
        prevPageText: "上一篇",
        nextPageText: "下一篇",
        outlineTitle: "目录",
        searchPlaceholderText: "搜索",
        searchNoResultsText: "未搜索到相关结果",
        searchSuggestedQueryText: "可更换不同的关键字后重试",
      },
    ],
  },
  plugins: [
    pluginShiki({
      transformers: [createTransformerDiff(), createTransformerHighlight()],
    }),
  ],
})
