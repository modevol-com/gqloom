import { useData } from "vitepress"
import VPImage from "vitepress/dist/client/theme-default/components/VPImage.vue"
import VPNavBarSearch from "vitepress/dist/client/theme-default/components/VPNavBarSearch.vue"
import { useLangs } from "vitepress/dist/client/theme-default/composables/langs.js"
import { useSidebar } from "vitepress/dist/client/theme-default/composables/sidebar.js"
import { normalizeLink } from "vitepress/dist/client/theme-default/support/utils.js"
import { computed, defineComponent } from "vue"
import { cn } from "@/css"

export default defineComponent((_props, { slots }) => {
  const { site, theme } = useData()
  const { hasSidebar } = useSidebar()
  const { currentLang } = useLangs()

  const link = computed(() =>
    typeof theme.value.logoLink === "string"
      ? theme.value.logoLink
      : theme.value.logoLink?.link
  )

  const rel = computed(() =>
    typeof theme.value.logoLink === "string"
      ? undefined
      : theme.value.logoLink?.rel
  )

  const target = computed(() =>
    typeof theme.value.logoLink === "string"
      ? undefined
      : theme.value.logoLink?.target
  )
  return () => (
    <div
      class={
        "VPNavBarTitle vp-raw h-(--vp-nav-height) min-[960px]:w-(--vp-sidebar-width) min-[960px]:px-4 max-[960px]:gap-4 flex flex-row items-center justify-between"
      }
    >
      <a
        class={cn(
          "flex h-10 items-center border-b border-transparent text-base font-semibold text-(--vp-c-text-1) transition-opacity duration-250",
          hasSidebar.value && ""
        )}
        href={link.value ?? normalizeLink(currentLang.value.link)}
        rel={rel.value}
        target={target.value}
      >
        {slots["nav-bar-title-before"]?.()}
        {theme.value.logo && (
          <VPImage
            class="mr-2 h-(--vp-nav-logo-height)"
            image={theme.value.logo}
          />
        )}
        {theme.value.siteTitle ? (
          <span
            class="text-sm text-yellow-700 dark:text-amber-200"
            v-html={theme.value.siteTitle}
          />
        ) : theme.value.siteTitle === undefined ? (
          <span class="text-sm text-yellow-700 dark:text-amber-200">
            {site.value.title}
          </span>
        ) : null}
        {slots["nav-bar-title-after"]?.()}
      </a>
      <VPNavBarSearch />
    </div>
  )
})
