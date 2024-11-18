import * as path from "path"
import {
  createTransformerDiff,
  createTransformerHighlight,
  pluginShiki,
} from "@rspress/plugin-shiki"
import { defineConfig } from "rspress/config"

export default defineConfig({
  root: "docs",
  title: "GQLoom",
  lang: "en",
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
      langs: [
        "prisma",
        "graphql",
        "gql",
        "sql",
        "typescript",
        "ts",
        "tsx",
        "javascript",
        "js",
        "json",
        "jsx",
        "bash",
      ],
      transformers: [createTransformerDiff(), createTransformerHighlight()],
    }),
  ],
})
