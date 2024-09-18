import { defineConfig } from "rspress/config"
import {
  createTransformerDiff,
  createTransformerHighlight,
  pluginShiki,
} from "@rspress/plugin-shiki"

export default defineConfig({
  // 文档根目录
  root: "docs",
  lang: "en",
  locales: [
    {
      lang: "en",
      // 导航栏切换语言的标签
      label: "English",
      title: "GQLoom",
      description: "GraphQL Loom",
    },
    {
      lang: "zh",
      // 导航栏切换语言的标签
      label: "简体中文",
      title: "GQLoom",
      description: "GraphQL 纺织机",
    },
  ],
  plugins: [
    pluginShiki({
      transformers: [createTransformerDiff(), createTransformerHighlight()],
    }),
  ],
})
