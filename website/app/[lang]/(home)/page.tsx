import { FlowingLines } from "@/components/flowing-lines"
import { homeSource } from "@/lib/source"
import clsx from "clsx"
import DynamicLink from "fumadocs-core/dynamic-link"
import { Card, type CardProps, Cards } from "fumadocs-ui/components/card"
import {
  ArrowRight,
  Fence,
  HardDriveDownload,
  RadioTower,
  Satellite,
  SatelliteDish,
  Shuffle,
} from "lucide-react"
import type { MDXProps } from "mdx/types"
import Link from "next/link"
import { ORMLibrary, type SupportedORM } from "./orm-library"
import { mdxComponents } from "./utils"

export interface LangProps {
  lang: string
  className?: string
}

const mdx: Record<SupportedORM, React.FC<MDXProps>> = {
  Drizzle: homeSource.getPage(["drizzle"])!.data.body,
  Prisma: homeSource.getPage(["prisma"])!.data.body,
  MikroORM: homeSource.getPage(["mikro-orm"])!.data.body,
}

export default async function HomePage(props: {
  params: Promise<{ lang: string }>
}) {
  const lang = (await props.params).lang

  return (
    <main className="flex flex-col items-center">
      <Hero lang={lang} />
      <SchemaLibrary className="mt-24 lg:mt-32" lang={lang} />
      <Features className="mt-24 lg:mt-32" lang={lang} />
      <ORMLibrary
        className="mt-24 lg:mt-32"
        lang={lang}
        drizzleMDX={<mdx.Drizzle components={mdxComponents} />}
        prismaMDX={<mdx.Prisma components={mdxComponents} />}
        mikroOrmMDX={<mdx.MikroORM components={mdxComponents} />}
      />
      <GraphQLIntro className="mt-24 lg:mt-32" lang={lang} />
      <div className="mt-24" />
      <FlowingLines />
    </main>
  )
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

function Hero({ lang }: LangProps) {
  const hero = lang === "zh" ? heroCn : heroEn
  return (
    <section className="flex flex-col-reverse sm:flex-row max-w-5xl justify-evenly items-center w-full pt-0 pb-12 sm:pt-10 md:pt-16">
      <div className="flex flex-col gap-6 max-w-md text-center items-center">
        <h1 className="text-4xl text-transparent bg-gradient-to-r from-pink-500 to-yellow-500 dark:from-rose-400 dark:to-orange-300 sm:text-5xl font-bold bg-clip-text">
          GraphQL Loom
        </h1>
        <p className="text-lg">{hero.description}</p>
        <div className="flex flex-wrap px-4 gap-4">
          <Link
            href="https://github.com/modevol-com/gqloom"
            target="_blank"
            className="hover:scale-105 ease-out text-nowrap border-orange-400 bg-pink-300/10 border-2 transition duration-300 hover:bg-rose-500/20 dark:hover:bg-orange-300/20 py-3 px-6 rounded-full"
          >
            {hero.star}
          </Link>
          <DynamicLink
            href="/[lang]/docs/getting-started"
            className="hover:scale-105 ease-out text-nowrap px-6 py-3 flex items-center font-medium text-white transition duration-300 bg-gradient-to-r from-pink-600 to-orange-400 rounded-full hover:from-pink-500 hover:to-amber-300"
          >
            <span>{hero.start}</span>
            <ArrowRight className="ml-2 inline-block" />
          </DynamicLink>
        </div>
      </div>
      <img className="sm:w-sm w-3xs" src="/gqloom.svg" alt="GQLoom" />
    </section>
  )
}

const featuresCn: CardProps[] = [
  {
    icon: <RadioTower />,
    title: "解析器（Resolver）",
    description:
      "解析器是 GQLoom 的核心组件，你可以在其中定义查询、变更和订阅操作，还能为对象动态添加额外字段，实现灵活的数据处理。",
    href: "/[lang]/docs/resolver",
  },
  {
    icon: <Shuffle />,
    title: "上下文（Context）",
    description:
      "借助上下文机制，你能够在应用程序的任意位置便捷地进行数据注入，确保数据在不同组件和层次间高效流通。",
    href: "/[lang]/docs/context",
  },
  {
    icon: <Fence />,
    title: "中间件（Middleware）",
    description:
      "采用面向切面编程的思想，中间件允许你在解析过程中无缝嵌入额外逻辑，如错误捕获、用户权限校验和日志追踪，增强系统的健壮性和可维护性。",
    href: "/[lang]/docs/middleware",
  },
  {
    icon: <HardDriveDownload />,
    title: "数据加载器（Dataloader）",
    description:
      "数据加载器是优化性能的利器，它能够批量获取数据，显著减少数据库的查询次数，有效提升系统性能，同时让代码结构更加清晰，易于维护。",
    href: "/[lang]/docs/dataloader",
  },
  {
    icon: <SatelliteDish />,
    title: "订阅（Subscription）",
    description:
      "订阅功能为客户端提供了实时获取数据更新的能力，无需手动轮询，确保客户端始终与服务器数据保持同步，提升用户体验。",
    href: "/[lang]/docs/advanced/subscription",
  },
  {
    icon: <Satellite />,
    title: "联邦图（Federation）",
    description:
      "联邦图是一种微服务化的 GraphQL 架构，它能够轻松聚合多个服务，实现跨服务查询，让你可以像操作单个图一样管理复杂的分布式系统。",
    href: "/[lang]/docs/advanced/federation",
  },
]

const featuresEN: CardProps[] = [
  {
    icon: <RadioTower />,
    title: "Resolver",
    description:
      "Resolvers are the core components of GraphQL. You can define query, mutation, and subscription operations within them, and also dynamically add additional fields to objects for flexible data processing.",
    href: "/[lang]/docs/resolver",
  },
  {
    icon: <Shuffle />,
    title: "Context",
    description:
      "With the context mechanism, you can conveniently inject data anywhere in the application, ensuring efficient data flow between different components and layers.",
    href: "/[lang]/docs/context",
  },
  {
    icon: <Fence />,
    title: "Middleware",
    description:
      "Adopting the concept of aspect - oriented programming, middleware allows you to seamlessly integrate additional logic during the resolution process, such as error handling, user permission verification, and log tracking, enhancing the robustness and maintainability of the system.",
    href: "/[lang]/docs/middleware",
  },
  {
    icon: <HardDriveDownload />,
    title: "Dataloader",
    description:
      "Dataloader is a powerful tool for optimizing performance. It can fetch data in batches, significantly reducing the number of database queries, effectively improving system performance, and making the code structure clearer and easier to maintain.",
    href: "/[lang]/docs/dataloader",
  },
  {
    icon: <SatelliteDish />,
    title: "Subscription",
    description:
      "The subscription feature provides clients with the ability to obtain real - time data updates without manual polling, ensuring that clients always stay in sync with server data and enhancing the user experience.",
    href: "/[lang]/docs/advanced/subscription",
  },
  {
    icon: <Satellite />,
    title: "Federation",
    description:
      "Federation is a microservice - based GraphQL architecture that can easily aggregate multiple services to enable cross - service queries, allowing you to manage complex distributed systems as if operating on a single graph.",
    href: "/[lang]/docs/advanced/federation",
  },
]

function Features({ lang, className }: LangProps) {
  const features = lang === "zh" ? featuresCn : featuresEN
  const title = lang === "zh" ? "全功能 GraphQL" : "Full Featured GraphQL"
  return (
    <section
      className={clsx("px-6 max-w-5xl flex flex-col items-center", className)}
    >
      <h2 className="text-3xl font-bold tracking-wider">{title}</h2>
      <Cards className="mt-12">
        {features.map(({ href, ...props }, i) => (
          <Card
            key={i}
            {...props}
            href={href ? href.replace(/\[lang\]/, lang) : href}
          />
        ))}
      </Cards>
    </section>
  )
}
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

function GraphQLIntro({ lang, className }: LangProps) {
  const highlights = lang === "zh" ? highlightsCN : highlightsEN

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
    <section
      className={clsx("flex flex-col px-6 items-center max-w-5xl", className)}
    >
      {lang === "zh" ? (
        <h2 className="text-3xl font-bold tracking-wider">
          {GraphQLLink} 的磅礴之力
        </h2>
      ) : (
        <h2 className="text-3xl font-bold tracking-wider">
          Full Power of {GraphQLLink}
        </h2>
      )}
      <ul className="flex flex-wrap justify-center gap-12 mt-16 px-8 xl:gap-x-16">
        {highlights.map((item, index) => (
          <Highlight key={index} {...item} className="space-y-3 max-w-3xs" />
        ))}
      </ul>
    </section>
  )
}

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

const SchemaLibrary = function SchemaLibrary({ lang, className }: LangProps) {
  const title =
    lang === "zh"
      ? "最为熟知的 Schema Library"
      : "The most familiar Schema Library"
  const intros = lang === "zh" ? SchemaLibraryCN : SchemaLibraryEN
  return (
    <section className={clsx("px-6 flex flex-col items-center", className)}>
      <h2 className="text-3xl font-bold tracking-wider">{title}</h2>
      <div className="flex flex-col lg:flex-row gap-x-8 mt-12">
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
}

function Highlight({
  emoji,
  heading,
  text,
  className,
}: IHighlight & { className?: string }) {
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
}

interface IHighlight {
  emoji: string
  heading: string
  text: string
}
