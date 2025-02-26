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
  {
    text: "Advanced",
    collapsed: false,
    items: [
      {
        text: "Adapters",
        link: "/docs/advanced/adapters/",
        collapsed: true,
        items: [
          {
            text: "Yoga",
            link: "/docs/advanced/adapters/yoga",
          },
          {
            text: "Mercurius",
            link: "/docs/advanced/adapters/mercurius",
          },
          {
            text: "Apollo",
            link: "/docs/advanced/adapters/apollo",
          },
          {
            text: "Hono",
            link: "/docs/advanced/adapters/hono",
          },
        ],
      },
      {
        text: "Printing Schema",
        link: "/docs/advanced/printing-schema",
      },
      {
        text: "Subscription",
        link: "/docs/advanced/subscription",
      },
      {
        text: "Federation",
        link: "/docs/advanced/federation",
      },
    ],
  },
] satisfies DefaultTheme.Config["sidebar"]
