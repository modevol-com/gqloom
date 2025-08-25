<template>
  <a :href="props.to"
    class="bg-slate-100/60 dark:bg-slate-900/60 hover:border-orange-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors mb-2 w-fit flex flex-col gap-2 rounded-md p-4 border-2 border-slate-300/10 shadow">
    <div class="bg-slate-200/60 dark:bg-slate-800/60 p-1 size-fit rounded border-solid border border-slate-300/40">
      <LucideIcon :icon="props.icon" class="size-5" />
    </div>
    <h3 class="mb-1 text-sm font-medium">{{ props.title }}</h3>
    <p class="my-0 text-sm text-fd-muted-foreground">{{ props.description }}</p>
  </a>
</template>
<script lang="ts" setup>
import LucideIcon, { type LucideIconName } from "./lucide-icon.vue"

export interface FeatureProps {
  to: string
  title: string
  description: string
  icon: LucideIconName
}

const props = defineProps<FeatureProps>()
</script>