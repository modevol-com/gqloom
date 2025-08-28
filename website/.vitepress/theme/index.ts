import TwoslashFloatingVue from "@shikijs/vitepress-twoslash/client"
import type { Theme } from "vitepress"
import type { EnhanceAppContext } from "vitepress"
import DefaultTheme from "vitepress/theme-without-fonts"
import { Layout } from "./layout"
import "../../css/tailwind.css"
import "./style.css"
import "./code-icons.css"
import "../../css/input-schema.css"
import "@shikijs/vitepress-twoslash/style.css"

export default {
  extends: DefaultTheme,
  enhanceApp({ app }: EnhanceAppContext) {
    app.use(TwoslashFloatingVue)
  },
  Layout,
} satisfies Theme
