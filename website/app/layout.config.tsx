import DocText from "@/components/doc-text"
import { GQLoomLogo } from "@/components/gqloom-logo"
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared"
import { memo } from "react"

const Title = memo(() => {
  return (
    <>
      <GQLoomLogo className="w-6" />
      <span className="text-yellow-600 dark:text-amber-200">GQLoom</span>
    </>
  )
})

/**
 * Shared layout configurations
 *
 * you can configure layouts individually from:
 * Home Layout: app/(home)/layout.tsx
 * Docs Layout: app/docs/layout.tsx
 */
export const baseOptions: BaseLayoutProps = {
  nav: {
    // can be JSX too!
    title: <Title />,
  },
  githubUrl: "https://github.com/modevol-com/gqloom",
  i18n: true,
  links: [
    {
      type: "custom",
      children: <DocText />,
    },
  ],
}
