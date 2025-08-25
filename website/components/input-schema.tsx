import { type SlotsType, defineComponent, ref } from "vue"
import type { JSX } from "vue/jsx-runtime"

export const inputSchema = ref<"valibot" | "zod">("valibot")

// 定义 slots 的类型接口
interface InputSchemaSlots {
  valibot?: () => JSX.Element
  zod?: () => JSX.Element
}

export const InputSchemaCodes = defineComponent({
  name: "InputSchemaCodes",
  slots: Object as SlotsType<InputSchemaSlots>,
  setup(_, { slots }) {
    return () => {
      if (inputSchema.value === "valibot" && slots.valibot) {
        return slots.valibot()
      }
      if (inputSchema.value === "zod" && slots.zod) {
        return slots.zod()
      }
      return null
    }
  },
})
