import { baseOptions } from "@/app/layout.config"
import { source } from "@/lib/source"
import { DocsLayout } from "fumadocs-ui/layouts/docs"
import type { ReactNode } from "react"

export default async function Layout({
  children,
  params,
}: { children: ReactNode; params: Promise<{ lang: string }> }) {
  return (
    <DocsLayout tree={source.pageTree[(await params).lang]} {...baseOptions}>
      {children}
    </DocsLayout>
  )
}
