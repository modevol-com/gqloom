<template>
  <template v-for="(orm, index) in supportedORM" :key="orm">
    <span @click="tab = orm" :class="[
      'mx-[0.2em] border-b-2 border-solid transition-colors cursor-pointer hover:text-rose-700 hover:opacity-80 dark:hover:text-rose-200',
      tab === orm ? 'border-rose-500' : 'opacity-60 border-transparent',
    ]">
      {{ orm }}
    </span>
    <span v-if="index !== supportedORM.length - 1">{{ splitter }}</span>
  </template>
</template>

<script setup lang="ts">
import { useData } from "vitepress"
import { computed } from "vue"

// 定义支持的 ORM 类型
const supportedORM = ["Drizzle", "MikroORM", "Prisma"] as const
export type SupportedORM = (typeof supportedORM)[number]

// 使用 defineModel 定义双向绑定的 tab 属性
const tab = defineModel<SupportedORM>("tab", { required: true })

// 根据语言计算分隔符
const { lang } = useData()
const splitter = computed(() => (lang.value === "zh" ? "、" : ", "))
</script>