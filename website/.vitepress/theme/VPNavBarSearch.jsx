import VPNavBarSearch from "vitepress/dist/client/theme-default/components/VPNavBarSearch.vue"
import { defineComponent } from "vue"

export default defineComponent({
  props: {
    enable: { type: Boolean, default: false },
  },
  setup(props) {
    return () => (props.enable ? <VPNavBarSearch /> : null)
  },
})
