<template>
  <main class="flex flex-col items-center relative" style="display: flex;">
    <div class="left-0 absolute -z-10 opacity-10 flex flex-col items-center h-[75vh] w-[max(100vh,100vw)]">
      <FlowingLines class="size-full" />
    </div>
    <Hero class="min-h-[64vh]" />
  </main>
</template>
<script lang="tsx" setup>
import Hero from "./home-hero.vue";
import FlowingLines from "./flowing-lines.vue";
</script>