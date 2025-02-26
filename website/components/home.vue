<template>
  <main class="overflow-x-hidden flex flex-col items-center relative" style="display: flex;">
    <div class="left-0 absolute -z-10 opacity-10 flex flex-col items-center h-[75vh] w-[max(100vh,100vw)]">
      <FlowingLines class="size-full" />
    </div>
    <Hero class="min-h-[64vh]" />
    <HomeSchemaLibrary class="mt-[max(8vh,4rem)]">
      <template v-slot:schemaLibraries>
        <slot name="schemaLibraries"></slot>
      </template>
      <template v-slot:schemaGraphQl>
        <slot name="schemaGraphQl"></slot>
      </template>
    </HomeSchemaLibrary>
    <HomeFeatures />
  </main>
</template>
<script lang="tsx" setup>
import Hero from "./home-hero.vue";
import FlowingLines from "./flowing-lines.vue";
import HomeSchemaLibrary from './home-schema-library.vue'
import HomeFeatures from './home-features.vue'
</script>