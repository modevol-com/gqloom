<template>
  <section class="flex flex-col-reverse sm:flex-row max-w-5xl justify-evenly items-center w-full">
    <div class="flex flex-col gap-6 w-md max-w-screen text-center items-center">
      <h1>GraphQL Loom</h1>
      <div class="text-lg dark:text-white text-black sm:mt-4">
        {{ texts.description }}
      </div>
      <div class="flex flex-wrap px-4 gap-4">
        <a href="https://github.com/modevol-com/gqloom" target="_blank"
          class="star text-gray-900 dark:text-gray-100 backdrop-blur-md border-orange-400 bg-pink-100/10 border-2 hover:bg-rose-400/20 dark:hover:bg-orange-300/20 py-3 px-6 rounded-full">
          {{ texts.star }}
        </a>
        <a href="./docs/getting-started"
          class="start !text-white px-6 py-3 flex items-center font-medium bg-gradient-to-r to-pink-600 from-orange-400 rounded-full hover:to-pink-500 hover:from-amber-300">
          <span>{{ texts.start }}</span>
          <ArrowRight class="ml-2 inline-block" />
        </a>
      </div>
    </div>
    <div class="sm:w-sm w-3xs relative">
      <div
        class="blur-3xl absolute left-0 top-0 -z-1 rounded-full opacity-10 dark:opacity-30 bg-gradient-to-bl to-rose-400/20 from-yellow-400/5 size-full aspect-square" />
      <img src="/gqloom.svg" class="size-full" />
    </div>
  </section>
</template>
<style scoped>
@reference "@/css/tailwind.css";

h1 {
  @apply text-4xl text-transparent bg-gradient-to-r from-pink-500 to-yellow-500 dark:from-rose-400 dark:to-orange-300 sm:text-5xl font-bold bg-clip-text
}

a.star {
  @apply text-gray-900 dark:text-gray-100
}

a.start {
  @apply text-white
}

a.star,
a.start {
  @apply no-underline hover:scale-105 ease-out text-nowrap transition duration-300;
}
</style>
<script setup lang="ts">
import { useData } from "vitepress"
import { computed } from "vue"

const { lang } = useData()

const texts = computed(() => {
  if (lang.value === "zh")
    return {
      description: "将运行时类型编织成 GraphQL Schema",
      star: "在 GitHub 点亮繁星",
      start: "快速上手",
    }
  return {
    description: "Weaving runtime types into GraphQL Schema",
    star: "Star on GitHub",
    start: "Getting Started",
  }
})
</script>