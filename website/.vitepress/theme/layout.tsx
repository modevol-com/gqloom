import DefaultTheme from "vitepress/theme-without-fonts"
import { defineComponent } from "vue"

export const Layout = defineComponent(() => {
  return () => <DefaultTheme.Layout></DefaultTheme.Layout>
})
