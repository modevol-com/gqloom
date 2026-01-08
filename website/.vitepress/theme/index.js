import TwoslashFloatingVue from "@shikijs/vitepress-twoslash/client"
import DefaultTheme from "vitepress/theme-without-fonts"
import CopyOrDownloadAsMarkdownButtons from "./CopyOrDownloadAsMarkdownButtons.jsx"
import { Layout } from "./layout.jsx"
import "../../css/tailwind.css"
import "./style.css"
import "./code-icons.css"
import "@shikijs/vitepress-twoslash/style.css"

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.use(TwoslashFloatingVue)
    app.component(
      "CopyOrDownloadAsMarkdownButtons",
      CopyOrDownloadAsMarkdownButtons
    )
  },
  Layout,
}
