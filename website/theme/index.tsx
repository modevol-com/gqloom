import { type ComponentProps, memo, useMemo } from "react"
import { useLang } from "rspress/runtime"
import Theme from "rspress/theme"
import { HomeHero } from "rspress/theme"

const HomeLayout = memo(() => {
  const lang = useLang()

  const frontmatter = useMemo<
    ComponentProps<typeof HomeHero>["frontmatter"]
  >(() => {
    const name = "GQLoom"
    const image = {
      src: "/gqloom.svg",
      alt: "GQLoom-Logo",
    }
    switch (lang) {
      case "zh":
        return {
          hero: {
            name,
            image,
            text: "GraphQL 纺织器",
            tagline: "将运行时类型编织为 GraphQL",
            actions: [
              {
                theme: "brand",
                text: "介绍",
                link: "/zh/guide/introduction",
              },
              {
                theme: "alt",
                text: "快速开始",
                link: "/zh/guide/getting-started",
              },
            ],
          },
        }
      case "en":
      default:
        return {
          hero: {
            name,
            image,
            text: "GraphQL Loom",
            tagline: "Weave runtime types into GraphQL",
            actions: [
              {
                theme: "brand",
                text: "Introduction",
                link: "/guide/introduction",
              },
              {
                theme: "alt",
                text: "Getting Started",
                link: "/guide/getting-started",
              },
            ],
          },
        }
    }
  }, [lang])
  return (
    <>
      <HomeHero frontmatter={frontmatter} routePath="" />
    </>
  )
})

export default {
  ...Theme,
  HomeLayout,
}

export * from "rspress/theme"
