import { defineComponent } from "vue"

export interface IHighlight {
  emoji: string
  heading: string
  text: string
}

interface Props extends IHighlight {
  class?: string
}

export const Highlight = defineComponent({
  name: "Highlight",
  props: ["class", "emoji", "heading", "text"],
  setup(props: Props) {
    return () => (
      <li class={["flex flex-col items-start text-left", props.class]}>
        <div class="flex flex-row text-nowrap text-xl gap-3 border-b-3 border-orange-300/50">
          <span>{props.emoji}</span>
          <h3 class="!font-medium !text-xl text-slate-900 dark:text-slate-200">
            {props.heading}
          </h3>
        </div>
        <p class="opacity-70">{props.text}</p>
      </li>
    )
  },
})
