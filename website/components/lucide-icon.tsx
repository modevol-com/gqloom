import {
  Fence,
  HardDriveDownload,
  RadioTower,
  Satellite,
  SatelliteDish,
  Shuffle,
} from "lucide-vue-next"
import { computed, defineComponent } from "vue"

const icons = {
  Fence,
  HardDriveDownload,
  RadioTower,
  Satellite,
  SatelliteDish,
  Shuffle,
}

export type LucideIconName = keyof typeof icons

export interface LucideIconProps {
  icon: LucideIconName
  class?: string
}

export const LucideIcon = defineComponent({
  name: "LucideIcon",
  props: ["icon", "class"],
  setup(props: LucideIconProps) {
    const iconComponent = computed(() => icons[props.icon])

    return () => {
      const Icon = iconComponent.value
      if (!Icon) return null
      return <Icon class={props.class} />
    }
  },
})
