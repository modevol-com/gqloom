import { createMDX } from "fumadocs-mdx/next"

const withMDX = createMDX()

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  redirects: async () => [
    {
      source: "/guide/schema-integration/:slug",
      destination: "/en/docs/schema/:slug",
      permanent: true,
    },
    {
      source: "/zh/guide/schema-integration/:slug",
      destination: "/zh/docs/schema/:slug",
      permanent: true,
    },
    {
      source: "/guide/introduction.html",
      destination: "/docs",
      permanent: true,
    },
    {
      source: "/guide/:slug",
      destination: "/en/docs/:slug",
      permanent: true,
    },
    {
      source: "/zh/guide/:slug",
      destination: "/zh/docs/:slug",
      permanent: true,
    },
  ],
  serverExternalPackages: ["@node-rs/jieba", "twoslash"],
  experimental: {
    webpackMemoryOptimizations: true,
  },
}

export default withMDX(config)
