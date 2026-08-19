import { Icon } from "@iconify/vue"
import { computed, defineComponent } from "vue"

export interface FeatureProps {
  to: string
  icon?: string
  title: string
  description: string
}

export const FeatureCard = defineComponent({
  name: "FeatureCard",
  props: ["to", "icon", "title", "description"],
  setup(props: FeatureProps) {
    const href = computed(() => {
      if (props.to.endsWith(".html")) {
        return props.to
      }
      return `${props.to}.html`
    })
    return () => (
      <a
        href={href.value}
        class="bg-slate-100/60 dark:bg-slate-900/60 hover:border-pink-400 dark:hover:border-rose-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors mb-2 w-full flex flex-col gap-2 rounded-md p-4 border-2 border-slate-300/10 shadow"
      >
        {props.icon && (
          <div class="bg-slate-200/60 dark:bg-slate-800/60 p-1 size-fit rounded border-solid border border-slate-300/40">
            <Icon icon={props.icon} class="size-5" />
          </div>
        )}
        <h3 class="mb-1 text-sm font-medium">{props.title}</h3>
        <p class="my-0 text-sm text-fd-muted-foreground">{props.description}</p>
      </a>
    )
  },
})
