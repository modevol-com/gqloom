<template>
  <slot v-if="inputSchema === 'valibot'" name="valibot"></slot>
  <slot v-else-if="inputSchema === 'zod'" name="zod"></slot>
</template>
<script lang="ts" setup>
import { inputSchema } from './input-schema'
</script>