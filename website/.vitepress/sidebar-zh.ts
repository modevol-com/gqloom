import type { DefaultTheme } from "vitepress"

export default [
  {
    text: "介绍",
    link: "/zh/docs/",
  },
  {
    text: "入门指南",
    link: "/zh/docs/guide",
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
      {
        text: "MikroORM",
        link: "/zh/docs/schema/mikro-orm",
      },
    ],
  },
  {
    text: "进阶功能",
    collapsed: false,
    items: [
      {
        text: "适配器",
        link: "/zh/docs/advanced/adapters/",
        collapsed: true,
        items: [
          {
            text: "Yoga",
            link: "/zh/docs/advanced/adapters/yoga",
          },
          {
            text: "Mercurius",
            link: "/zh/docs/advanced/adapters/mercurius",
          },
          {
            text: "Apollo",
            link: "/zh/docs/advanced/adapters/apollo",
          },
          {
            text: "Hono",
            link: "/zh/docs/advanced/adapters/hono",
          },
          {
            text: "Elysia",
            link: "/zh/docs/advanced/adapters/elysia",
          },
        ],
      },
      {
        text: "打印 Schema",
        link: "/zh/docs/advanced/printing-schema",
      },
      {
        text: "订阅（Subscription）",
        link: "/zh/docs/advanced/subscription",
      },
      {
        text: "联邦图（Federation）",
        link: "/zh/docs/advanced/federation",
      },
    ],
  },
] satisfies DefaultTheme.Config["sidebar"]
