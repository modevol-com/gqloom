<template>
  <section class="px-6 max-w-5xl flex flex-col items-center" :class="props.class">
    <h2 class="!text-3xl !font-bold tracking-wider" :class="props.class">{{ title }}</h2>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-12">
      <FeatureCard v-for="feature in features" :key="feature.title" v-bind="feature" />
    </div>
  </section>
</template>
<script lang="ts" setup>
import { useData } from "vitepress"
import { computed } from "vue"
import FeatureCard, { FeatureProps } from "./feature-card.vue"

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

const { lang } = useData()
const features = computed(() => {
  return lang.value === "zh" ? featuresZH : featuresEN
})

const title = computed(() => {
  return lang.value === "zh" ? "全功能 GraphQL" : "Full Featured GraphQL"
})

const props = defineProps<{
  class?: string
}>()
</script>