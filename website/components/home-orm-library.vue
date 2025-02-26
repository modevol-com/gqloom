<template>
  <section class="px-6 flex flex-col items-center" :class="props.class">
    <h2 class="!text-3xl !font-bold tracking-wider">{{ intro.title }}</h2>
    <div class="flex flex-col mt-12 lg:flex-row gap-8">
      <div class="max-w-lg mt-4">
        <p class="text-xl text-slate-900 dark:text-slate-100">
          <template v-if="lang === 'zh'">
            通过 <a className="!text-amber-600 dark:!text-orange-400 font-bold" :href="url">
              ResolverFactory
            </a> 使用在
            <ORMTabs v-model:tab="tab" /> 已定义的数据库模型创建 CRUD 操作。
          </template>
          <template v-else></template>
        </p>
        <ul class="space-y-10 !mt-16">
          <li v-for="(d, index) in intro.descriptions" :key="index" class="text-slate-700/70 dark:text-slate-300/70">
            {{ d }}
          </li>
        </ul>
      </div>
      <div class="vp-doc vp-doc-home-orm w-xl max-w-[90vw]">
        <slot v-if="tab === 'Drizzle'" name="drizzle"></slot>
        <slot v-else-if="tab === 'Prisma'" name="prisma"></slot>
        <slot v-else-if="tab === 'MikroORM'" name="mikro"></slot>
      </div>
    </div>
  </section>
</template>
<style>
@reference "@/css/tailwind.css";

.vp-doc-home-orm {
  code {
    @apply max-h-[32em] max-w-xl overflow-auto
  }
}
</style>
<script lang="ts" setup>
import { useData } from "vitepress"
import { computed, ref } from "vue";
import ORMTabs, { SupportedORM } from "./home-orm-library-tabs.vue";
const props = defineProps<{
  class?: string
}>()

const { lang } = useData()

const ormIntroZH = {
  title: "增删改查接口已就绪，只待启用",
  descriptions: [
    "恰似以精巧技艺织就锦章，将精准定义的数据库表格毫无瑕疵地嵌入 GraphQL Schema 架构体系，达成数据库表格与接口之间的无缝对接。",
    "仅需编写少量代码，即可从数据库表格出发，举重若轻地搭建起增删改查操作体系，全方位沉浸于对象关系映射（ORM）技术所赋予的便捷体验之中。",
    "不光是解析器能够灵活塑造，即便是单一操作，也可通过巧妙融入输入项与中间件，达成独具匠心的定制效果，精准贴合多样化需求。",
    "凭借高度灵活的构建策略，游刃有余地对解析器进行拼接组合，毫无阻碍地在数据图中植入各类操作，充分挖掘并拓展无限可能。",
  ],
}

const ormIntroEN = {
  title: "CRUD interfaces are ready for activation",
  descriptions: [
    "Like a skilled weaver, embed precisely defined database tables seamlessly into the GraphQL Schema.",
    "With just a few lines of code, easily build a CRUD system and enjoy ORM's convenience.",
    "Both resolvers and single operations can be customized with inputs and middleware to meet diverse needs.",
    "Using a flexible approach, freely combine resolvers and add operations to the graph for endless potential.",
  ],
}
const intro = computed(() => {
  return lang.value === "zh" ? ormIntroZH : ormIntroEN
})
const tab = ref<SupportedORM>('Drizzle')

const url = computed(() => {
  const ormPage = {
    Drizzle: "drizzle",
    Prisma: "prisma",
    MikroORM: "mikro-orm",
  }[tab.value]
  const hash = lang.value === "zh" ? "#解析器工厂" : "#resolver-factory"
  return `./docs/schema/${ormPage}${hash}`
})

</script>