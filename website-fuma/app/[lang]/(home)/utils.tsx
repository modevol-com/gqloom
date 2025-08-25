import { Popup, PopupContent, PopupTrigger } from "fumadocs-twoslash/ui"
import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock"
import { Tab, Tabs } from "fumadocs-ui/components/tabs"
import defaultMdxComponents from "fumadocs-ui/mdx"

export const mdxComponents = {
  ...defaultMdxComponents,
  pre: ({ children, ...props }: React.ComponentProps<"pre">) => (
    <CodeBlock {...props}>
      <Pre className="max-w-xl w-full overflow-auto max-h-128">{children}</Pre>
    </CodeBlock>
  ),
  Tab,
  Tabs,
  Popup,
  PopupContent,
  PopupTrigger,
}
