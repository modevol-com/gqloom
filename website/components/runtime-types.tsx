import { useData } from "vitepress"
import {
  type CSSProperties,
  computed,
  defineComponent,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue"

const runtimeTypeItems = [
  {
    name: "Default",
    href: undefined,
    class: "text-nowrap",
    getText: (lang: string) => (lang === "zh" ? "运行时类型" : "runtime types"),
  },
  {
    name: "Valibot",
    href: "./docs/schema/valibot",
    class: "dark:text-amber-200 text-orange-700 text-nowrap font-semibold",
    getText: (lang: string) => `Valibot ${lang === "zh" ? "类型" : "types"}`,
  },
  {
    name: "Zod",
    href: "./docs/schema/zod",
    class: "dark:text-cyan-400 text-cyan-700 text-nowrap font-semibold",
    getText: (lang: string) => `Zod ${lang === "zh" ? "类型" : "types"}`,
  },
  {
    name: "Yup",
    href: "./docs/schema/yup",
    class: "dark:text-stone-300 text-stone-700 text-nowrap font-semibold",
    getText: (lang: string) => `Yup ${lang === "zh" ? "类型" : "types"}`,
  },
  {
    name: "Drizzle",
    href: "./docs/schema/drizzle",
    class: "dark:text-teal-400 text-teal-600 text-nowrap font-semibold",
    getText: () => "Drizzle Table",
  },
  {
    name: "Prisma",
    href: "./docs/schema/prisma",
    class: "dark:text-blue-400 text-blue-700 text-nowrap font-semibold",
    getText: () => "Prisma Model",
  },
  {
    name: "MikroORM",
    href: "./docs/schema/mikro-orm",
    class: "dark:text-sky-400 text-sky-800 text-nowrap font-semibold",
    getText: () => "Mikro ORM Entity",
  },
]

export const RuntimeTypes = defineComponent({
  name: "RuntimeTypes",
  setup() {
    const { lang } = useData()
    const currentItemIndex = ref(0)
    const lock = ref(false)
    const itemElements = ref<HTMLElement[]>([])
    const widths = ref<number[]>([])

    const containerStyle = computed(() => ({
      width: widths.value[currentItemIndex.value]
        ? `${widths.value[currentItemIndex.value]}px`
        : "auto",
      transition: "width 233ms ease-out",
    }))

    let intervalId: ReturnType<typeof setInterval> | undefined

    const startInterval = () => {
      stopInterval()
      intervalId = setInterval(() => {
        if (!lock.value) {
          currentItemIndex.value =
            (currentItemIndex.value + 1) % runtimeTypeItems.length
        }
      }, 2333)
    }

    const stopInterval = () => {
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = undefined
      }
    }

    onMounted(() => {
      widths.value = itemElements.value.map((el) => el.offsetWidth)
      startInterval()
    })

    onBeforeUnmount(() => {
      stopInterval()
    })

    watch(lang, () => {
      setTimeout(() => {
        widths.value = itemElements.value.map((el) => el.offsetWidth)
      }, 0)
    })

    return () => (
      <span
        onMouseenter={() => (lock.value = true)}
        onMouseleave={() => (lock.value = false)}
        class="relative inline h-[1.5em] mx-[0.1em]"
        style={containerStyle.value}
      >
        {runtimeTypeItems.map((item, i) => {
          const content = item.getText(lang.value)
          const sharedProps = {
            ref: (el: any) => {
              if (el) itemElements.value[i] = el
            },
            style: {
              ...(i !== 0 && {
                position: "absolute",
                bottom: 0,
                left: 0,
              }),
              transition: "opacity 233ms ease-in-out",
              opacity: i === currentItemIndex.value ? 1 : 0,
              pointerEvents: i === currentItemIndex.value ? "auto" : "none",
            } as CSSProperties,
          }
          if (item.href) {
            return (
              <a href={item.href} {...sharedProps}>
                <strong class={item.class}>{content}</strong>
              </a>
            )
          }
          return <span {...sharedProps}>{content}</span>
        })}
      </span>
    )
  },
})
