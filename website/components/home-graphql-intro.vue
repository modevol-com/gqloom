<template>
  <section :class="['flex flex-col px-6 items-center max-w-5xl', props.class]">
    <h2 v-if="lang === 'zh'" class="!text-3xl !font-bold tracking-wider">
      <a href="https://graphql.org/" target="_blank"
        className="underline text-4xl !text-pink-600 dark:!text-rose-400 opacity-90 transition-opacity hover:opacity-100">
        GraphQL
      </a> 的磅礴之力
    </h2>
    <h2 v-else class="text-3xl font-bold tracking-wider">
      Full Power of <a href="https://graphql.org/" target="_blank"
        className="underline text-4xl !text-pink-600 dark:!text-rose-400 opacity-90 transition-opacity hover:opacity-100">
        GraphQL
      </a>
    </h2>
    <ul class="flex flex-wrap justify-center gap-12 !mt-16 px-8 xl:gap-x-16">
      <Highlight v-for="(item, index) in highlights" :key="index" :emoji="item.emoji" :heading="item.heading"
        :text="item.text" class="space-y-3 max-w-3xs" />
    </ul>
  </section>
</template>
<script setup lang="ts">
import { useData } from "vitepress"
import { computed } from "vue"
import Highlight, { IHighlight } from "./highlight.vue"

const { lang } = useData()
const props = defineProps<{
  class?: string
}>()

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
const highlights = computed(() =>
  lang.value === "zh" ? highlightsZH : highlightsEN
)
</script>