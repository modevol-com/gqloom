import "../global.css"
import { I18nProvider, type Translations } from "fumadocs-ui/i18n"
import { RootProvider } from "fumadocs-ui/provider"
import { Inter } from "next/font/google"
import type { ReactNode } from "react"

const inter = Inter({
  subsets: ["latin"],
})

const cn: Partial<Translations> = {
  search: "搜索",
  searchNoResult: "没有结果",
  chooseLanguage: "选择语言",
  nextPage: "下一页",
  previousPage: "上一页",
  editOnGithub: "在 GitHub 上编辑此页面",
}

const translations: Record<string, Partial<Translations>> = { cn }

// available languages that will be displayed on UI
// make sure `locale` is consistent with your i18n config
const locales = [
  {
    name: "English",
    locale: "en",
  },
  {
    name: "简体中文",
    locale: "cn",
  },
]

export default async function Layout({
  params,
  children,
}: { params: Promise<{ lang: string }>; children: ReactNode }) {
  const lang = (await params).lang
  return (
    <html lang={lang} className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <I18nProvider
          locale={lang}
          locales={locales}
          translations={translations[lang]}
        >
          <RootProvider>{children}</RootProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
