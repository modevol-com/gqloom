import { homeSource } from "@/lib/source"
import clsx from "clsx"
import DynamicLink from "fumadocs-core/dynamic-link"
import {} from "fumadocs-twoslash/ui"
import {} from "fumadocs-ui/components/codeblock"
import {} from "fumadocs-ui/components/tabs"
import { ArrowRight } from "lucide-react"
import type { MDXProps } from "mdx/types"
import Link from "next/link"
import { memo } from "react"
import { ORMLibrary, type SupportedORM } from "./orm-library"
import { mdxComponents } from "./utils"

export interface LangProps {
  lang: string
}

export default async function HomePage(props: {
  params: Promise<{ lang: string }>
}) {
  const lang = (await props.params).lang
  return (
    <main className="flex flex-col items-center">
      <Hero lang={lang} />
      <SchemaLibrary lang={lang} />
      <ORMLibrary
        lang={lang}
        DrizzleMDX={<mdx.Drizzle components={mdxComponents} />}
        PrismaMDX={<mdx.Prisma components={mdxComponents} />}
        MikroOrmMDX={<mdx.MikroORM components={mdxComponents} />}
      />
      <GraphQLIntro lang={lang} />
      <div className="h-72" />
    </main>
  )
}

const mdx: Record<SupportedORM, React.FC<MDXProps>> = {
  Drizzle: homeSource.getPage(["drizzle"])!.data.body,
  Prisma: homeSource.getPage(["prisma"])!.data.body,
  MikroORM: homeSource.getPage(["mikro-orm"])!.data.body,
}

const heroEn = {
  description: "Weaving runtime types into GraphQL Schema",
  star: "Star on GitHub",
  start: "Getting Started",
}

const heroCn = {
  description: "将运行时类型编织成 GraphQL Schema",
  star: "在 GitHub 点亮繁星",
  start: "快速上手",
}

const Hero = memo<LangProps>(function Hero({ lang }) {
  const hero = lang === "cn" ? heroCn : heroEn
  return (
    <section className="flex flex-col-reverse sm:flex-row max-w-5xl justify-evenly items-center w-full pt-0 pb-12 sm:pt-10 md:pt-16 md:pb-16">
      <div className="flex flex-col gap-6 max-w-md text-center items-center">
        <h1 className="text-4xl text-transparent bg-gradient-to-r from-pink-500 to-yellow-500 dark:from-rose-400 dark:to-orange-300 sm:text-5xl font-bold bg-clip-text">
          GraphQL Loom
        </h1>
        <p className="text-lg">{hero.description}</p>
        <div className="flex flex-wrap px-4 gap-4">
          <Link
            href="https://github.com/modevol-com/gqloom"
            target="_blank"
            className="text-nowrap border-orange-400 bg-pink-300/10 border-2 transition-colors duration-300 hover:bg-rose-500/20 dark:hover:bg-orange-300/20 py-3 px-6 rounded-full"
          >
            {hero.star}
          </Link>
          <DynamicLink
            href="/[lang]/docs/getting-started"
            className="text-nowrap px-6 py-3 flex items-center font-medium text-white transition-colors duration-300 bg-gradient-to-r from-pink-600 to-orange-400 rounded-full hover:from-pink-500 hover:to-amber-300"
          >
            <span>{hero.start}</span>
            <ArrowRight className="ml-2 inline-block" />
          </DynamicLink>
        </div>
      </div>
      <img className="sm:w-sm w-3xs" src="/gqloom.svg" alt="GQLoom" />
    </section>
  )
})

const highlightsEN: IHighlight[] = [
  {
    emoji: "🔐",
    heading: "Type Safety",
    text: "Strong type system to ensure the consistency and security of data from the server to the client.",
  },
  {
    emoji: "🧩",
    heading: "Flexible Aggregation",
    text: "Automatically aggregate multiple queries, reducing the number of client requests and ensuring the simplicity of the server-side API.",
  },
  {
    emoji: "🚀",
    heading: "Efficient Querying",
    text: "The client can specify the required data structure, reducing unnecessary data transfer and improving the performance and maintainability of the API.",
  },
  {
    emoji: "🔌",
    heading: "Easy to Extend",
    text: "Extending the API by adding new fields and types without modifying existing code.",
  },
  {
    emoji: "👥",
    heading: "Efficient Collaboration",
    text: "Using Schema as documentation, which can reduce communication costs and improve development efficiency in team development.",
  },
  {
    emoji: "🌳",
    heading: "Thriving Ecosystem",
    text: "Tools and frameworks are emerging constantly. The active community, with diverse applications, is growing fast and has bright prospects.",
  },
]

const highlightsCN: IHighlight[] = [
  {
    emoji: "🔐",
    heading: "类型安全",
    text: "强类型查询语言，可以确保从服务端到客户端数据的一致性和安全性。",
  },
  {
    emoji: "🧩",
    heading: "灵活聚合",
    text: "自动聚合多个查询，既减少客户端的请求次数，也保证服务端 API 的简洁性。",
  },
  {
    emoji: "🚀",
    heading: "高效查询",
    text: "客户端可以指定所需的数据结构，从而减少不必要的数据传输，提高 API 的性能和可维护性。",
  },
  {
    emoji: "🔌",
    heading: "易于扩展",
    text: "通过添加新的字段和类型来扩展 API，而不需要修改现有的代码。",
  },
  {
    emoji: "👥",
    heading: "高效协作",
    text: "使用 Schema 作为文档，减少沟通成本，提高开发效率。",
  },
  {
    emoji: "🌳",
    heading: "繁荣生态",
    text: "各类工具与框架不断推陈出新，社区活跃且发展迅速，应用领域广泛且未来前景广阔。",
  },
]

const GraphQLIntro = memo<LangProps>(function GraphQLIntro({ lang }) {
  const highlights = lang === "cn" ? highlightsCN : highlightsEN

  const GraphQLLink = (
    <Link
      href="https://graphql.org/"
      target="_blank"
      className="underline text-4xl text-pink-600 dark:text-rose-400 opacity-90 transition-opacity hover:opacity-100"
    >
      GraphQL
    </Link>
  )

  return (
    <section className="flex flex-col px-6 items-center max-w-5xl gap-16 mt-16 md:mt-20">
      {lang === "cn" ? (
        <h2 className="text-3xl font-bold tracking-wider">
          {GraphQLLink} 的磅礴之力
        </h2>
      ) : (
        <h2 className="text-3xl font-bold tracking-wider">
          Full Power of {GraphQLLink}
        </h2>
      )}
      <ul className="flex flex-wrap justify-center gap-12 px-8 xl:gap-x-16">
        {highlights.map((item, index) => (
          <Highlight key={index} {...item} className="space-y-3 max-w-3xs" />
        ))}
      </ul>
    </section>
  )
})

const SchemaLibraryCN: IHighlight[] = [
  {
    emoji: "🧩",
    heading: "丰富集成",
    text: "使用你最熟悉的验证库和 ORM 来建构你的下一个 GraphQL 应用；",
  },
  {
    emoji: "🔒",
    heading: "类型安全",
    text: "从 Schema 自动推导类型，在开发时享受智能提示，在编译时发现潜在问题；",
  },
  {
    emoji: "🔋",
    heading: "整装待发",
    text: "中间件、上下文、订阅、联邦图已经准备就绪；",
  },
  {
    emoji: "🔮",
    heading: "抛却魔法",
    text: "没有装饰器、没有元数据和反射、没有代码生成，只需要 JavaScript/TypeScript 就可以在任何地方运行；",
  },
  {
    emoji: "🧑‍💻",
    heading: "开发体验",
    text: "更少的样板代码、语义化的 API 设计、广泛的生态集成使开发愉快；",
  },
]

const SchemaLibraryEN: IHighlight[] = [
  {
    emoji: "🧩",
    heading: "Rich Integration",
    text: "Use your most familiar validation libraries and ORMs to build your next GraphQL application.",
  },
  {
    emoji: "🔒",
    heading: "Type Safety",
    text: "Automatically infer types from the Schema, enjoy intelligent code completion during development, and detect potential problems during compilation.",
  },
  {
    emoji: "🔋",
    heading: "Fully Prepared",
    text: "Middleware, context, subscriptions, and federated graphs are ready.",
  },
  {
    emoji: "🔮",
    heading: "No Magic",
    text: "Without decorators, metadata, reflection, or code generation, it can run anywhere with just JavaScript/TypeScript.",
  },
  {
    emoji: "🧑‍💻",
    heading: "Development Experience",
    text: "Fewer boilerplate codes, semantic API design, and extensive ecosystem integration make development enjoyable.",
  },
]

const SchemaLibrariesMDX: React.FC<MDXProps> = homeSource.getPage([
  "schema-libraries",
])!.data.body

const SchemaGraphQlMDX: React.FC<MDXProps> = homeSource.getPage([
  "schema-graphql",
])!.data.body

const SchemaLibrary = memo<LangProps>(function SchemaLibrary({ lang }) {
  const title =
    lang === "cn"
      ? "最为熟知的 Schema Library"
      : "The most familiar Schema Library"
  const intros = lang === "cn" ? SchemaLibraryCN : SchemaLibraryEN
  return (
    <section className="mt-16 px-6 md:mt-20 flex flex-col items-center">
      <h2 className="text-3xl font-bold tracking-wider">{title}</h2>
      <div className="flex flex-col md:flex-row gap-x-8 mt-16">
        <div className="flex flex-col items-center max-w-[90vw]">
          <div className="w-full h-[33em]">
            <SchemaLibrariesMDX components={mdxComponents} />
          </div>
          <div className="w-full">
            <SchemaGraphQlMDX components={mdxComponents} />
          </div>
        </div>
        <ul className="flex flex-col justify-center gap-12 px-8 xl:gap-x-24">
          {intros.map((intro, index) => (
            <Highlight key={index} {...intro} className="max-w-md" />
          ))}
        </ul>
      </div>
    </section>
  )
})

const Highlight = memo<IHighlight & { className?: string }>(function Highlight({
  emoji,
  heading,
  text,
  className,
}) {
  return (
    <li className={clsx("flex flex-col items-start text-left", className)}>
      <div className="flex flex-row text-nowrap text-xl gap-3 border-b-3 border-orange-300/50">
        <span>{emoji}</span>
        <h3 className="font-medium text-slate-900 dark:text-slate-200">
          {heading}
        </h3>
      </div>
      <p className="opacity-70">{text}</p>
    </li>
  )
})

interface IHighlight {
  emoji: string
  heading: string
  text: string
}
