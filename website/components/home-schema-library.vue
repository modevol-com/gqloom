<template>
  <section class="px-6 flex flex-col items-center" :class="props.class">
    <h2 class="!text-3xl !font-bold !tracking-wider">{{ title }}</h2>
    <div class="flex flex-col lg:flex-row gap-x-8 mt-12">
      <div class="flex flex-col items-center max-w-[90vw]">
        <div class="vp-doc vp-doc-home-schema w-full">
          <slot name="schemaLibraries" />
        </div>
        <div class="vp-doc w-full">
          <slot name="schemaGraphQl" />
        </div>
      </div>
      <ul class="flex flex-col justify-center gap-12 px-8 xl:gap-x-24">
        <Highlight v-for="(intro, index) in intros" :key="index" :emoji="intro.emoji" :heading="intro.heading"
          :text="intro.text" class="max-w-md" />
      </ul>
    </div>
  </section>
</template>
<style>
@reference "@/css/tailwind.css";

.vp-doc-home-schema {
  code {
    @apply max-h-[32em] max-w-xl overflow-auto
  }
}
</style>
<script lang="ts" setup>
import { useData } from "vitepress"
import { computed } from "vue"
import Highlight, { IHighlight } from "./highlight.vue"

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

const { lang } = useData()
const title = computed(() => {
  return lang.value === "zh"
    ? "最为熟知的类型库"
    : "The most familiar Schema Library"
})
const intros = computed(() => {
  return lang.value === "zh" ? SchemaLibraryCN : SchemaLibraryEN
})

const props = defineProps<{ class?: string }>()
</script>