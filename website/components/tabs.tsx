import {
  TabsContent,
  TabsIndicator,
  TabsList,
  TabsRoot,
  TabsTrigger,
} from "reka-ui"
import { type VNode, computed, defineComponent, reactive } from "vue"

export interface TabProps {
  title: string
}

export interface TabsProps {
  groupId?: string
}

const tabGroups = reactive(new Map<string, string>())

export const Tab = defineComponent({
  name: "Tab",
  props: ["title"],
  render() {
    return this.$slots.default?.()
  },
})

export const Tabs = defineComponent({
  name: "Tabs",
  props: ["groupId"],
  setup(props: TabsProps, { slots }) {
    const slotsContent = (slots.default?.() ?? []) as VNode[]
    const tabs = slotsContent.filter(
      (node) => (node.type as any)?.name === "Tab"
    )
    const tabTitles = tabs.map((node) => (node.props as TabProps)?.title ?? "")
    const defaultValue = tabTitles.length > 0 ? tabTitles[0] : ""

    const modelValue = computed({
      get() {
        if (!props.groupId) return undefined
        if (!tabGroups.has(props.groupId!)) {
          tabGroups.set(props.groupId!, defaultValue)
        }
        return tabGroups.get(props.groupId!)
      },
      set(newValue) {
        if (props.groupId && newValue) {
          tabGroups.set(props.groupId, newValue)
        }
      },
    })

    const onUpdateModelValue = (value: string | number) => {
      if (typeof value === "string") {
        modelValue.value = value
      }
    }

    return () => (
      <TabsRoot
        defaultValue={props.groupId ? undefined : defaultValue}
        modelValue={modelValue.value}
        onUpdate:modelValue={props.groupId ? onUpdateModelValue : undefined}
        class="mt-4"
      >
        <TabsList class="relative flex items-center gap-4 border-b border-b-slate-200 dark:border-b-slate-700">
          {tabTitles.map((title) => (
            <TabsTrigger
              key={title}
              value={title}
              class="px-3 py-2 !font-medium !text-slate-500 data-[state=active]:!text-pink-600 dark:!text-slate-400 dark:data-[state=active]:!text-rose-400"
            >
              {title}
            </TabsTrigger>
          ))}
          <TabsIndicator class="absolute bottom-[-1px] h-[2px] w-[var(--reka-tabs-indicator-size)] translate-x-[var(--reka-tabs-indicator-position)] rounded-t-lg bg-pink-600 transition-all duration-200 dark:bg-rose-400" />
        </TabsList>
        {tabs.map((tab, index) => (
          <TabsContent key={tabTitles[index]} value={tabTitles[index]}>
            {tab}
          </TabsContent>
        ))}
      </TabsRoot>
    )
  },
})
