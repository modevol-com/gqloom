import * as fs from "node:fs/promises"
import fg from "fast-glob"
import { remarkInclude } from "fumadocs-mdx/config"
import matter from "gray-matter"
import { remark } from "remark"
import remarkGfm from "remark-gfm"
import remarkMdx from "remark-mdx"
import remarkStringify from "remark-stringify"
import * as YAML from "yaml"

export const revalidate = false

const processor = remark()
  .use(remarkMdx)
  // https://fumadocs.dev/docs/mdx/include
  .use(remarkInclude)
  // gfm styles
  .use(remarkGfm)
  // .use(your remark plugins)
  .use(remarkStringify) // to string

// 缓存处理结果
const cache = new Map<string, { content: string; timestamp: number }>()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export async function GET(
  _: Request,
  { params }: { params: Promise<{ lang: "en" | "zh" }> }
) {
  const { lang } = await params
  const cacheKey = `llms_${lang}`

  // 检查缓存
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return new Response(cached.content)
  }

  const files = await (() => {
    if (lang === "zh") {
      return fg("./content/docs/*.zh.{mdx,md}")
    }
    return fg("./content/docs/*.{mdx,md}", {
      ignore: ["**/*.zh.{mdx,md}"],
    })
  })()

  const scan = files.map(async (file) => {
    const fileContent = await fs.readFile(file)
    const { content, data } = matter(fileContent.toString())

    const processed = await processor.process({
      path: file,
      value: content,
    })
    const meta = { ...data, file }
    const text = processed
      .toString()
      .replace(/```ts twoslash[\s\S]*?\/\/ ---cut---\n/g, "```ts twoslash\n")

    const header = [`---`, `${YAML.stringify(meta).trim()}`, `---`].join("\n")
    return `${header}\n\n${text}`
  })

  const scanned = await Promise.all(scan)
  const result = scanned.join("\n\n")

  // 更新缓存
  cache.set(cacheKey, {
    content: result,
    timestamp: Date.now(),
  })

  return new Response(result)
}
