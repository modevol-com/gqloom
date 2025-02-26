import type { DefaultTheme } from "vitepress"

export default [
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
  {
    text: "上下文（Context）",
    link: "/zh/docs/context",
  },
  {
    text: "数据加载器（DataLoader）",
    link: "/zh/docs/dataloader",
  },
  {
    text: "中间件（Middleware）",
    link: "/zh/docs/middleware",
  },
  {
    text: "Schema 集成",
    collapsed: false,
    items: [
      {
        text: "Valibot",
        link: "/zh/docs/schema/valibot",
      },
      {
        text: "Zod",
        link: "/zh/docs/schema/zod",
      },
      {
        text: "Yup",
        link: "/zh/docs/schema/yup",
      },
      {
        text: "Drizzle",
        link: "/zh/docs/schema/drizzle",
      },
      {
        text: "Prisma",
        link: "/zh/docs/schema/prisma",
      },
    ],
  },
] satisfies DefaultTheme.Config["sidebar"]
