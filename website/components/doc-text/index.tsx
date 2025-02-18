"use client"
import { useParams } from "next/navigation"

export default function DocText() {
  const params = useParams<{ lang: string }>()

  if (params.lang === "zh") return "文档"
  return "Documentation"
}
