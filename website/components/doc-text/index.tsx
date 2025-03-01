"use client"
import Link from "next/link"
import { useParams } from "next/navigation"

export default function DocText() {
  const params = useParams<{ lang: string }>()

  const text = params.lang === "zh" ? "文档" : "Documentation"
  return (
    <Link href={`/${params.lang}/docs`} className="font-semibold">
      {text}
    </Link>
  )
}
