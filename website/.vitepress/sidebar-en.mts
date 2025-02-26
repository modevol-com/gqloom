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
] satisfies DefaultTheme.Config["sidebar"]
