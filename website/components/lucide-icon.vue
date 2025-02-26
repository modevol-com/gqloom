<template>
  <component :is="icon" :class="props.class" />
</template>
<script lang="ts" setup>
import { computed, defineProps } from 'vue'
import {
  Fence,
  HardDriveDownload,
  RadioTower,
  Satellite,
  SatelliteDish,
  Shuffle,
} from 'lucide-vue-next'

const icons = {
  Fence,
  HardDriveDownload,
  RadioTower,
  Satellite,
  SatelliteDish,
  Shuffle
}

export type LucideIconName = keyof typeof icons

const props = defineProps<{
  icon: LucideIconName
  class?: string
}>()

const icon = computed(() => icons[props.icon])
</script>