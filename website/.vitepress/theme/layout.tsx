import { useData, useRouter } from "vitepress"
import DefaultTheme from "vitepress/theme-without-fonts"
import { defineComponent, watchEffect } from "vue"

export const Layout = defineComponent(() => {
  useRedirect()
  return () => <DefaultTheme.Layout></DefaultTheme.Layout>
})

function useRedirect() {
  const { page } = useData()
  const router = useRouter()
  watchEffect(() => {
    if (!page.value.isNotFound) return
    let targetPath = page.value.relativePath
    if (targetPath.startsWith("en")) {
      targetPath = targetPath.replace("en", "")
    }
    if (targetPath.includes("/getting-started")) {
      targetPath = targetPath.replace("/getting-started", "/guide")
    }
    const suffixRegex = /\.(md|html)$/
    while (suffixRegex.test(targetPath)) {
      targetPath = targetPath.replace(suffixRegex, "")
    }
    if (targetPath !== page.value.relativePath) {
      router.go(targetPath, { replace: true })
    }
  })
}
