"use client"
import Link from "next/link"
import { useParams, usePathname } from "next/navigation"

export default function DocText() {
  const params = useParams<{ lang: string }>()
  const pathname = usePathname()
  const pathDepth = pathname.split("/").filter(Boolean).length
  if (pathDepth > 1) {
    return null
  }

  const text = params.lang === "zh" ? "文档" : "Documentation"
  return (
    <Link
      href={`/${params.lang}/docs`}
      className="font-semibold flex flex-row items-center gap-2 rounded-md px-3 py-2.5 text-fd-muted-foreground transition-colors duration-100 [overflow-wrap:anywhere] hover:bg-fd-accent/50 hover:text-fd-accent-foreground/80 hover:transition-none md:px-2 md:py-1.5 [&_svg]:size-4"
    >
      {text}
    </Link>
  )
}
