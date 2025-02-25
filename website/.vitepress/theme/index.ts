import TwoslashFloatingVue from "@shikijs/vitepress-twoslash/client"
import type { Theme } from "vitepress"
import type { EnhanceAppContext } from "vitepress"
import DefaultTheme from "vitepress/theme"
// https://vitepress.dev/guide/custom-theme
import { h } from "vue"
import "../../css/tailwind.css"
import "./style.css"

import "@shikijs/vitepress-twoslash/style.css"

export default {
  extends: DefaultTheme,
  enhanceApp({ app }: EnhanceAppContext) {
    app.use(TwoslashFloatingVue)
  },
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // https://vitepress.dev/guide/extending-default-theme#layout-slots
    })
  },
} satisfies Theme
