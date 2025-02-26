import type { DefaultTheme } from "vitepress"

export default [
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
  {
    text: "Context",
    link: "/docs/context",
  },
  {
    text: "DataLoader",
    link: "/docs/dataloader",
  },
  {
    text: "Middleware",
    link: "/docs/middleware",
  },
  {
    text: "Schema Integration",
    collapsed: false,
    items: [
      {
        text: "Valibot",
        link: "/docs/schema/valibot",
      },
      {
        text: "Zod",
        link: "/docs/schema/zod",
      },
      {
        text: "Yup",
        link: "/docs/schema/yup",
      },
      {
        text: "Drizzle",
        link: "/docs/schema/drizzle",
      },
      {
        text: "Prisma",
        link: "/docs/schema/prisma",
      },
      {
        text: "MikroORM",
        link: "/docs/schema/mikro-orm",
      },
    ],
  },
] satisfies DefaultTheme.Config["sidebar"]
