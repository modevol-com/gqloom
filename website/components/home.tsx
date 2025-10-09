import { Icon } from "@iconify/vue"
import { useData } from "vitepress"
import { computed, defineComponent, ref, type SlotsType } from "vue"
import { FeatureCard } from "./feature-card"
import { FlowingLines } from "./flowing-lines"
import { Highlight } from "./highlight"
import styles from "./home.module.css"
import * as textEn from "./home-text-en"
import * as textZh from "./home-text-zh"
import { RuntimeTypes } from "./runtime-types"

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
      lang.value === "zh" ? textZh.highlights : textEn.highlights
    )

    return () => (
      <section class={["px-6 flex flex-col items-center", props.class]}>
        <h2 class="!text-3xl !font-bold !tracking-wider">{title.value}</h2>
        <div class="flex flex-col lg:flex-row gap-x-8 mt-12">
          <div class="flex flex-col items-center max-w-[90vw] w-144">
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

const HomeFeatures = defineComponent({
  name: "HomeFeatures",
  props: {
    class: String,
  },
  setup(props) {
    const { lang } = useData()

    const features = computed(() => {
      return lang.value === "zh" ? textZh.features : textEn.features
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

export const ormTab = ref<SupportedORM>("Drizzle")

const OrmTabs = defineComponent({
  name: "OrmTabs",
  setup() {
    const { lang } = useData()
    const splitter = computed(() => (lang.value === "zh" ? "、" : ", "))

    const list = (() => {
      const arr: (SupportedORM | "__splitter")[] = []
      for (let i = 0; i < supportedORM.length; i++) {
        arr.push(supportedORM[i])
        if (i !== supportedORM.length - 1) {
          arr.push("__splitter")
        }
      }
      return arr
    })()

    return () => (
      <>
        {list.map((orm, index) => {
          if (orm === "__splitter") {
            return <span key={index}>{splitter.value}</span>
          }
          return (
            <span
              key={index}
              onClick={() => (ormTab.value = orm)}
              class={[
                "mx-[0.2em] border-b-2 border-solid transition-colors cursor-pointer hover:text-rose-700 hover:opacity-80 dark:hover:text-rose-200",
                ormTab.value === orm
                  ? "border-rose-500"
                  : "opacity-60 border-transparent",
              ]}
            >
              {orm}
            </span>
          )
        })}
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
    orm?: () => JSX.Element
  }>,
  setup(props, { slots }) {
    const { lang } = useData()

    const intro = computed(() => {
      return lang.value === "zh" ? textZh.ormIntro : textEn.ormIntro
    })

    const url = computed(() => {
      const ormPage = {
        Drizzle: "drizzle",
        Prisma: "prisma",
        MikroORM: "mikro-orm",
      }[ormTab.value]
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
                  <OrmTabs /> 已定义的数据库模型创建 CRUD 操作。
                </>
              ) : (
                <>
                  Create CRUD operations with predefined database models from{" "}
                  <OrmTabs /> by using{" "}
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
          <div class={["vp-doc w-xl max-w-[90vw]", styles["code-wrapper"]]}>
            {slots.orm?.()}
          </div>
        </div>
      </section>
    )
  },
})

const GraphQLIntro = defineComponent({
  name: "GraphQLIntro",
  props: {
    class: String,
  },
  setup(props) {
    const { lang } = useData()
    const highlights = computed(() =>
      lang.value === "zh" ? textZh.gqlHighlights : textEn.gqlHighlights
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
          start: "入门指南",
          description: "愉快且高效地建构 GraphQL 服务",
        }
      return {
        star: "Star on GitHub",
        start: "Guide",
        description: "Build GraphQL server enjoyably and efficiently",
      }
    })

    return () => (
      <section class="flex flex-col-reverse sm:flex-row max-w-5xl justify-evenly items-center w-full vp-raw">
        <div class="flex flex-col gap-6 w-md max-w-screen text-center items-center">
          <h1 class="text-4xl sm:text-5xl font-bold text-transparent bg-gradient-to-r from-pink-500 to-yellow-500 dark:from-rose-400 dark:to-orange-300 bg-clip-text">
            GraphQL Loom
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
              href="./docs/guide.html"
              class="no-underline hover:scale-105 ease-out text-nowrap transition duration-300 !text-white px-6 py-3 flex items-center font-medium bg-gradient-to-r to-pink-600 from-orange-400 rounded-full hover:to-pink-500 hover:from-amber-300"
            >
              <span>{texts.value.start}</span>
              <Icon icon="lucide:arrow-right" class="ml-2 inline-block" />
            </a>
          </div>
        </div>
        <div class="sm:w-sm w-3xs relative">
          <div class="blur-3xl absolute left-0 top-0 -z-1 rounded-full opacity-10 dark:opacity-30 bg-gradient-to-bl to-rose-400/20 from-yellow-400/5 size-full aspect-square" />
          <img alt="GQLoom Logo" src="/gqloom.svg" class="size-full" />
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
    orm?: () => JSX.Element
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
            orm: () => slots.orm?.(),
          }}
        </HomeOrmLibrary>
        <GraphQLIntro class="mt-24 lg:mt-32" />
        <div class="mt-24" />
      </main>
    )
  },
})
