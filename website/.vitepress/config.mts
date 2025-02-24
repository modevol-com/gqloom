import { defineConfig } from "vitepress"

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "GQLoom",
  srcDir: "./content",
  description:
    "GQLoom is a Code First GraphQL Schema Loom used to weave runtime types in the TypeScript/JavaScript ecosystem into a GraphQL Schema.",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      { text: "Examples", link: "/markdown-examples" },
    ],

    sidebar: [
      {
        text: "Examples",
        items: [
          { text: "Markdown Examples", link: "/markdown-examples" },
          { text: "Runtime API Examples", link: "/api-examples" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/vuejs/vitepress" },
    ],
  },
})
