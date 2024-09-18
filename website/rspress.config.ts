import { defineConfig } from "rspress/config"
import {
  createTransformerDiff,
  createTransformerHighlight,
  pluginShiki,
} from "@rspress/plugin-shiki"

export default defineConfig({
  // 文档根目录
  root: "docs",
  title: "GQLoom",
  lang: "en",
  logo: { dark: "/gqloom-name.svg", light: "/gqloom-name-light.svg" },
  icon: "/gqloom.svg",
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
  themeConfig: {
    socialLinks: [
      {
        icon: "github",
        mode: "link",
        content: "https://github.com/modevol-com/gqloom",
      },
    ],
    // 开启 View Transition 过渡
    enableContentAnimation: true,
    enableAppearanceAnimation: true,
    locales: [
      {
        label: "English",
        description: "GraphQL Loom",
        lang: "en",
        outlineTitle: "ON THIS Page",
      },
      {
        label: "简体中文",
        description: "GraphQL 织布机",
        lang: "zh",
        outlineTitle: "目录 ",
      },
    ],
  },
  plugins: [
    pluginShiki({
      transformers: [createTransformerDiff(), createTransformerHighlight()],
    }),
  ],
})
