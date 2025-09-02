import {
  TabsContent,
  TabsIndicator,
  TabsList,
  TabsRoot,
  TabsTrigger,
} from "reka-ui"
import { computed, defineComponent, reactive } from "vue"

export interface TabsProps {
  groupId?: string
}

const tabGroups = reactive(new Map<string, string>())

export const Tabs = defineComponent({
  name: "Tabs",
  props: ["groupId"],
  setup(props: TabsProps, { slots }) {
    const tabTitles = computed(() => Object.keys(slots))
    const defaultValue = computed(() =>
      tabTitles.value.length > 0 ? tabTitles.value[0] : ""
    )

    const modelValue = computed({
      get() {
        if (!props.groupId) return undefined
        if (!tabGroups.has(props.groupId!)) {
          tabGroups.set(props.groupId!, defaultValue.value)
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
        defaultValue={props.groupId ? undefined : defaultValue.value}
        modelValue={modelValue.value}
        onUpdate:modelValue={props.groupId ? onUpdateModelValue : undefined}
        class="mt-4"
      >
        <TabsList class="vp-raw relative flex items-center gap-4 border-b border-b-slate-200 dark:border-b-slate-700">
          {tabTitles.value.map((title) => (
            <TabsTrigger
              key={title}
              value={title}
              class="cursor-pointer x-2 py-1 font-medium text-slate-500 data-[state=active]:text-pink-600 dark:text-slate-400 dark:data-[state=active]:text-rose-400"
            >
              {title.replace(/_/g, " ")}
            </TabsTrigger>
          ))}
          <TabsIndicator class="absolute bottom-[-1px] h-[2px] w-[var(--reka-tabs-indicator-size)] translate-x-[var(--reka-tabs-indicator-position)] rounded-t-lg bg-pink-600 transition-all duration-200 dark:bg-rose-400" />
        </TabsList>
        {tabTitles.value.map((title) => (
          <TabsContent key={title} value={title}>
            {slots[title]?.()}
          </TabsContent>
        ))}
      </TabsRoot>
    )
  },
})
