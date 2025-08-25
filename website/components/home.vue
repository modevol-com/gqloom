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
    <HomeFeatures class="mt-24 lg:mt-32" />
    <HomeOrmLibrary class="mt-24 lg:mt-32">
      <template v-slot:drizzle>
        <slot name="drizzle"></slot>
      </template>
      <template v-slot:prisma>
        <slot name="prisma"></slot>
      </template>
      <template v-slot:mikro>
        <slot name="mikro"></slot>
      </template>
    </HomeOrmLibrary>
    <GraphQLIntro class="mt-24 lg:mt-32" />
    <div className="mt-24" />
  </main>
</template>
<script lang="tsx" setup>
import FlowingLines from "./flowing-lines.vue"
import HomeFeatures from "./home-features.vue"
import GraphQLIntro from "./home-graphql-intro.vue"
import Hero from "./home-hero.vue"
import HomeOrmLibrary from "./home-orm-library.vue"
import HomeSchemaLibrary from "./home-schema-library.vue"
</script>