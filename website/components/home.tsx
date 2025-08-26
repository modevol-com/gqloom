import { ArrowRight } from "lucide-vue-next"
import { useData } from "vitepress"
import {
  type PropType,
  type SlotsType,
  computed,
  defineComponent,
  ref,
} from "vue"
import { FeatureCard, type FeatureProps } from "./feature-card"
import { FlowingLines } from "./flowing-lines"
import { Highlight, type IHighlight } from "./highlight"
import styles from "./home.module.css"
import { RuntimeTypes } from "./runtime-types"

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

const HomeSchemaLibrary = defineComponent({
  name: "HomeSchemaLibrary",
  props: {
    class: String,
  },
  slots: Object as SlotsType<{
    schemaLibraries?: () => JSX.Element
    schemaGraphQl?: () => JSX.Element
  }>,
  setup(props, { slots }) {
    const { lang } = useData()

    const title = computed(() =>
      lang.value === "zh"
        ? "最为熟知的类型库"
        : "The most familiar Schema Library"
    )
    const intros = computed(() =>
      lang.value === "zh" ? SchemaLibraryCN : SchemaLibraryEN
    )

    return () => (
      <section class={["px-6 flex flex-col items-center", props.class]}>
        <h2 class="!text-3xl !font-bold !tracking-wider">{title.value}</h2>
        <div class="flex flex-col lg:flex-row gap-x-8 mt-12">
          <div class="flex flex-col items-center max-w-[90vw]">
            <div class={["vp-doc w-full", styles["code-wrapper"]].join(" ")}>
              {slots.schemaLibraries?.()}
            </div>
            <div class="vp-doc w-full">{slots.schemaGraphQl?.()}</div>
          </div>
          <ul class="flex flex-col justify-center gap-12 px-8 xl:gap-x-24">
            {intros.value.map((intro, index) => (
              <Highlight
                key={index}
                emoji={intro.emoji}
                heading={intro.heading}
                text={intro.text}
                class="max-w-md"
              />
            ))}
          </ul>
        </div>
      </section>
    )
  },
})

const featuresZH: FeatureProps[] = [
  {
    icon: "RadioTower",
    title: "解析器（Resolver）",
    description:
      "解析器是 GQLoom 的核心组件，你可以在其中定义查询、变更和订阅操作，还能为对象动态添加额外字段，实现灵活的数据处理。",
    to: "./docs/resolver",
  },
  {
    icon: "Shuffle",
    title: "上下文（Context）",
    description:
      "借助上下文机制，你能够在应用程序的任意位置便捷地进行数据注入，确保数据在不同组件和层次间高效流通。",
    to: "./docs/context",
  },
  {
    icon: "Fence",
    title: "中间件（Middleware）",
    description:
      "采用面向切面编程的思想，中间件允许你在解析过程中无缝嵌入额外逻辑，如错误捕获、用户权限校验和日志追踪，增强系统的健壮性和可维护性。",
    to: "./docs/middleware",
  },
  {
    icon: "HardDriveDownload",
    title: "数据加载器（Dataloader）",
    description:
      "数据加载器是优化性能的利器，它能够批量获取数据，显著减少数据库的查询次数，有效提升系统性能，同时让代码结构更加清晰，易于维护。",
    to: "./docs/dataloader",
  },
  {
    icon: "SatelliteDish",
    title: "订阅（Subscription）",
    description:
      "订阅功能为客户端提供了实时获取数据更新的能力，无需手动轮询，确保客户端始终与服务器数据保持同步，提升用户体验。",
    to: "./docs/advanced/subscription",
  },
  {
    icon: "Satellite",
    title: "联邦图（Federation）",
    description:
      "联邦图是一种微服务化的 GraphQL 架构，它能够轻松聚合多个服务，实现跨服务查询，让你可以像操作单个图一样管理复杂的分布式系统。",
    to: "./docs/advanced/federation",
  },
]

const featuresEN: FeatureProps[] = [
  {
    icon: "RadioTower",
    title: "Resolver",
    description:
      "Resolvers are the core components of GraphQL. You can define query, mutation, and subscription operations within them, and also dynamically add additional fields to objects for flexible data processing.",
    to: "./docs/resolver",
  },
  {
    icon: "Shuffle",
    title: "Context",
    description:
      "With the context mechanism, you can conveniently inject data anywhere in the application, ensuring efficient data flow between different components and layers.",
    to: "./docs/context",
  },
  {
    icon: "Fence",
    title: "Middleware",
    description:
      "Adopting the concept of aspect - oriented programming, middleware allows you to seamlessly integrate additional logic during the resolution process, such as error handling, user permission verification, and log tracking, enhancing the robustness and maintainability of the system.",
    to: "./docs/middleware",
  },
  {
    icon: "HardDriveDownload",
    title: "Dataloader",
    description:
      "Dataloader is a powerful tool for optimizing performance. It can fetch data in batches, significantly reducing the number of database queries, effectively improving system performance, and making the code structure clearer and easier to maintain.",
    to: "./docs/dataloader",
  },
  {
    icon: "SatelliteDish",
    title: "Subscription",
    description:
      "The subscription feature provides clients with the ability to obtain real - time data updates without manual polling, ensuring that clients always stay in sync with server data and enhancing the user experience.",
    to: "./docs/advanced/subscription",
  },
  {
    icon: "Satellite",
    title: "Federation",
    description:
      "Federation is a microservice - based GraphQL architecture that can easily aggregate multiple services to enable cross - service queries, allowing you to manage complex distributed systems as if operating on a single graph.",
    to: "./docs/advanced/federation",
  },
]

const HomeFeatures = defineComponent({
  name: "HomeFeatures",
  props: {
    class: String,
  },
  setup(props) {
    const { lang } = useData()

    const features = computed(() => {
      return lang.value === "zh" ? featuresZH : featuresEN
    })

    const title = computed(() => {
      return lang.value === "zh" ? "全功能 GraphQL" : "Full Featured GraphQL"
    })

    return () => (
      <section
        class={["px-6 max-w-5xl flex flex-col items-center", props.class]}
      >
        <h2 class={["!text-3xl !font-bold tracking-wider", props.class]}>
          {title.value}
        </h2>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-12">
          {features.value.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>
    )
  },
})

const supportedORM = ["Drizzle", "MikroORM", "Prisma"] as const
type SupportedORM = (typeof supportedORM)[number]

const OrmTabs = defineComponent({
  name: "OrmTabs",
  props: {
    tab: {
      type: String as PropType<SupportedORM>,
      required: true,
    },
  },
  emits: ["update:tab"],
  setup(props, { emit }) {
    const { lang } = useData()
    const splitter = computed(() => (lang.value === "zh" ? "、" : ", "))

    return () => (
      <>
        {supportedORM.map((orm, index) => (
          <>
            <span
              onClick={() => emit("update:tab", orm)}
              class={[
                "mx-[0.2em] border-b-2 border-solid transition-colors cursor-pointer hover:text-rose-700 hover:opacity-80 dark:hover:text-rose-200",
                props.tab === orm
                  ? "border-rose-500"
                  : "opacity-60 border-transparent",
              ]}
            >
              {orm}
            </span>
            {index !== supportedORM.length - 1 && <span>{splitter.value}</span>}
          </>
        ))}
      </>
    )
  },
})

const HomeOrmLibrary = defineComponent({
  name: "HomeOrmLibrary",
  props: {
    class: String,
  },
  slots: Object as SlotsType<{
    drizzle?: () => JSX.Element
    prisma?: () => JSX.Element
    mikro?: () => JSX.Element
  }>,
  setup(props, { slots }) {
    const { lang } = useData()
    const tab = ref<SupportedORM>("Drizzle")

    const ormIntroZH = {
      title: "增删改查接口已就绪",
      descriptions: [
        "恰似以精巧技艺织就锦章，将精准定义的数据库表格毫无瑕疵地嵌入 GraphQL Schema 架构体系，达成数据库表格与接口之间的无缝对接。",
        "仅需编写少量代码，即可从数据库表格出发，举重若轻地搭建起增删改查操作体系，全方位沉浸于对象关系映射（ORM）技术所赋予的便捷体验之中。",
        "不光是解析器能够灵活塑造，即便是单一操作，也可通过巧妙融入输入项与中间件，达成独具匠心的定制效果，精准贴合多样化需求。",
        "凭借高度灵活的构建策略，游刃有余地对解析器进行拼接组合，毫无阻碍地在数据图中植入各类操作，充分挖掘并拓展无限可能。",
      ],
    }

    const ormIntroEN = {
      title: "CRUD interfaces are ready for activation",
      descriptions: [
        "Like a skilled weaver, embed precisely defined database tables seamlessly into the GraphQL Schema.",
        "With just a few lines of code, easily build a CRUD system and enjoy ORM's convenience.",
        "Both resolvers and single operations can be customized with inputs and middleware to meet diverse needs.",
        "Using a flexible approach, freely combine resolvers and add operations to the graph for endless potential.",
      ],
    }
    const intro = computed(() => {
      return lang.value === "zh" ? ormIntroZH : ormIntroEN
    })

    const url = computed(() => {
      const ormPage = {
        Drizzle: "drizzle",
        Prisma: "prisma",
        MikroORM: "mikro-orm",
      }[tab.value]
      const hash = lang.value === "zh" ? "#解析器工厂" : "#resolver-factory"
      return `./docs/schema/${ormPage}${hash}`
    })
    return () => (
      <section class={["px-6 flex flex-col items-center", props.class]}>
        <h2 class="!text-3xl !font-bold tracking-wider">{intro.value.title}</h2>
        <div class="flex flex-col mt-12 lg:flex-row gap-8">
          <div class="max-w-lg mt-4">
            <p class="text-xl text-slate-900 dark:text-slate-100">
              {lang.value === "zh" ? (
                <>
                  通过{" "}
                  <a
                    class="!text-amber-600 dark:!text-orange-400 font-bold"
                    href={url.value}
                  >
                    ResolverFactory
                  </a>{" "}
                  使用在
                  <OrmTabs
                    tab={tab.value}
                    onUpdate:tab={(newTab) => (tab.value = newTab)}
                  />{" "}
                  已定义的数据库模型创建 CRUD 操作。
                </>
              ) : (
                <>
                  Create CRUD operations with predefined database models from{" "}
                  <OrmTabs
                    tab={tab.value}
                    onUpdate:tab={(newTab) => (tab.value = newTab)}
                  />{" "}
                  by using{" "}
                  <a
                    class="!text-amber-600 dark:!text-orange-400 font-bold"
                    href={url.value}
                  >
                    ResolverFactory
                  </a>
                  .
                </>
              )}
            </p>
            <ul class="space-y-10 !mt-16">
              {intro.value.descriptions.map((d, index) => (
                <li
                  key={index}
                  class="text-slate-700/70 dark:text-slate-300/70"
                >
                  {d}
                </li>
              ))}
            </ul>
          </div>
          <div
            class={["vp-doc w-xl max-w-[90vw]", styles["code-wrapper"]].join(
              " "
            )}
          >
            {tab.value === "Drizzle" && slots.drizzle?.()}
            {tab.value === "Prisma" && slots.prisma?.()}
            {tab.value === "MikroORM" && slots.mikro?.()}
          </div>
        </div>
      </section>
    )
  },
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

const highlightsZH: IHighlight[] = [
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

const GraphQLIntro = defineComponent({
  name: "GraphQLIntro",
  props: {
    class: String,
  },
  setup(props) {
    const { lang } = useData()
    const highlights = computed(() =>
      lang.value === "zh" ? highlightsZH : highlightsEN
    )
    return () => (
      <section
        class={["flex flex-col px-6 items-center max-w-5xl", props.class]}
      >
        {lang.value === "zh" ? (
          <h2 class="!text-3xl !font-bold tracking-wider">
            <a
              href="https://graphql.org/"
              target="_blank"
              class="text-4xl opacity-90 transition-opacity hover:opacity-100"
            >
              <b class="underline text-pink-600 dark:text-rose-400">GraphQL</b>
            </a>{" "}
            的磅礴之力
          </h2>
        ) : (
          <h2 class="!text-3xl !font-bold tracking-wider">
            Full Power of{" "}
            <a
              href="https://graphql.org/"
              target="_blank"
              class="text-4xl opacity-90 transition-opacity hover:opacity-100"
            >
              <b class="underline text-pink-600 dark:text-rose-400">GraphQL</b>
            </a>
          </h2>
        )}
        <ul class="flex flex-wrap justify-center gap-12 !mt-16 px-8 xl:gap-x-16">
          {highlights.value.map((item, index) => (
            <Highlight key={index} {...item} class="space-y-3 max-w-3xs" />
          ))}
        </ul>
      </section>
    )
  },
})

const Hero = defineComponent({
  name: "Hero",
  setup() {
    const { lang } = useData()

    const texts = computed(() => {
      if (lang.value === "zh")
        return {
          star: "在 GitHub 点亮繁星",
          start: "入门引导",
          description: "愉快且高效地建构 GraphQL 服务",
        }
      return {
        star: "Star on GitHub",
        start: "Guide",
        description: "Build GraphQL server enjoyably and efficiently",
      }
    })

    return () => (
      <section class="flex flex-col-reverse sm:flex-row max-w-5xl justify-evenly items-center w-full">
        <div class="flex flex-col gap-6 w-md max-w-screen text-center items-center">
          <h1 class="text-transparent bg-gradient-to-r from-pink-500 to-yellow-500 dark:from-rose-400 dark:to-orange-300 bg-clip-text">
            <b class="text-4xl sm:text-5xl font-bold">GraphQL Loom</b>
          </h1>
          <div class="dark:text-white text-black sm:mt-4 flex flex-col gap-1">
            {lang.value === "zh" ? (
              <div class="text-lg flex flex-wrap items-center justify-center">
                将
                <RuntimeTypes />
                编织成 GraphQL Schema
              </div>
            ) : (
              <div class="text-lg flex flex-wrap items-center justify-center">
                Weaving
                <RuntimeTypes />
                into GraphQL Schema
              </div>
            )}
            <p class="opacity-70">{texts.value.description}</p>
          </div>
          <div class="flex flex-wrap px-4 gap-4">
            <a
              href="https://github.com/modevol-com/gqloom"
              target="_blank"
              class="text-gray-900 dark:text-gray-100 no-underline hover:scale-105 ease-out text-nowrap transition duration-300 backdrop-blur-md border-orange-400 bg-pink-100/10 border-2 hover:bg-rose-400/20 dark:hover:bg-orange-300/20 py-3 px-6 rounded-full"
            >
              {texts.value.star}
            </a>
            <a
              href="./docs/getting-started"
              class="no-underline hover:scale-105 ease-out text-nowrap transition duration-300 !text-white px-6 py-3 flex items-center font-medium bg-gradient-to-r to-pink-600 from-orange-400 rounded-full hover:to-pink-500 hover:from-amber-300"
            >
              <span>{texts.value.start}</span>
              <ArrowRight class="ml-2 inline-block" />
            </a>
          </div>
        </div>
        <div class="sm:w-sm w-3xs relative">
          <div class="blur-3xl absolute left-0 top-0 -z-1 rounded-full opacity-10 dark:opacity-30 bg-gradient-to-bl to-rose-400/20 from-yellow-400/5 size-full aspect-square" />
          <img src="/gqloom.svg" class="size-full" />
        </div>
      </section>
    )
  },
})

export const Home = defineComponent({
  name: "Home",
  slots: Object as SlotsType<{
    schemaLibraries?: () => JSX.Element
    schemaGraphQl?: () => JSX.Element
    drizzle?: () => JSX.Element
    prisma?: () => JSX.Element
    mikro?: () => JSX.Element
  }>,
  setup(_, { slots }) {
    return () => (
      <main
        class="overflow-x-hidden flex flex-col items-center relative"
        style="display: flex;"
      >
        <div class="left-0 absolute -z-10 opacity-10 flex flex-col items-center h-[75vh] w-[max(100vh,100vw)]">
          <FlowingLines class="size-full" />
        </div>
        <Hero class="min-h-[64vh]" />
        <HomeSchemaLibrary class="mt-[max(8vh,4rem)]">
          {{
            schemaLibraries: () => slots.schemaLibraries?.(),
            schemaGraphQl: () => slots.schemaGraphQl?.(),
          }}
        </HomeSchemaLibrary>
        <HomeFeatures class="mt-24 lg:mt-32" />
        <HomeOrmLibrary class="mt-24 lg:mt-32">
          {{
            drizzle: () => slots.drizzle?.(),
            prisma: () => slots.prisma?.(),
            mikro: () => slots.mikro?.(),
          }}
        </HomeOrmLibrary>
        <GraphQLIntro class="mt-24 lg:mt-32" />
        <div class="mt-24" />
      </main>
    )
  },
})
