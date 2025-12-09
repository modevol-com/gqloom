import TwoslashFloatingVue from "@shikijs/vitepress-twoslash/client"
import DefaultTheme from "vitepress/theme-without-fonts"
import { Layout } from "./layout.jsx"
import "../../css/tailwind.css"
import "./style.css"
import "./code-icons.css"
import "@shikijs/vitepress-twoslash/style.css"

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.use(TwoslashFloatingVue)
  },
  Layout,
}
