import { docs, home, meta } from "@/.source"
import { loader } from "fumadocs-core/source"
import { createMDXSource } from "fumadocs-mdx"
import { icons } from "lucide-react"
import { createElement } from "react"
import { i18n } from "./i18n"

const icon = (icon: string | undefined) => {
  if (!icon) return

  if (icon in icons) return createElement(icons[icon as keyof typeof icons])
}
export const source = loader({
  baseUrl: "/docs",
  source: createMDXSource(docs, meta),
  i18n,
  icon,
})

export const homeSource = loader({
  baseUrl: "/",
  source: createMDXSource(home, home),
})
