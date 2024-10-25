import { Application, type TypeDocOptions } from "typedoc"
import * as fs from "fs/promises"
import * as path from "path"

const typeDocConfig = {
  plugin: ["typedoc-plugin-markdown"],
  entryPoints: ["../packages/*"],
  entryPointStrategy: "packages",
  packageOptions: {
    entryPoints: ["src/index.ts"],
    tsconfig: "./tsconfig.json",
  } as TypeDocOptions,
  modulesFileName: "index",
  tsconfig: "../packages/core/tsconfig.json",
  out: "docs/en/api",
  readme: "none",
  publicPath: "/api",
  entryFileName: "index",
  excludeScopesInPaths: true,
  mergeReadme: false,
  hidePageHeader: true,
  hideBreadcrumbs: true,
} as Partial<TypeDocOptions>

genDocs()

async function genDocs() {
  const app = await Application.bootstrapWithPlugins(typeDocConfig)
  const project = await app.convert()

  if (project == null) return

  // Rendered docs
  await app.generateDocs(project, typeDocConfig.out!)
  await genSideBar(path.resolve(process.cwd(), typeDocConfig.out!))
}

async function genSideBar(dir: string) {
  const files = await fs.readdir(dir, { withFileTypes: true })

  const sideBar: SideMetaItem[] = []
  for (const file of files) {
    // replace `TypeScript` to `ts`
    if (file.isDirectory() === false && file.name.endsWith(".md")) {
      const filePath = path.resolve(dir, file.name)
      const text = await fs.readFile(filePath, "utf-8")
      await fs.writeFile(filePath, text.replace(/```TypeScript/g, "```ts"))
    }

    if (!file.name.includes("index")) {
      // add to sidebar
      if (file.isDirectory()) {
        sideBar.push({
          type: "dir",
          name: file.name,
          label: file.name,
          collapsed: true,
        })
      } else {
        sideBar.push({
          type: "file",
          name: file.name,
          label: file.name.replace(/\.md$/, ""),
        })
      }
    } else {
      // hoist $module/index.md to $module.md
      const indexFile = path.resolve(dir, file.name)
      const afterFile = indexFile.replace("/index.md", ".md")
      await fs.rename(indexFile, afterFile)
      const text = await fs.readFile(afterFile, "utf-8")
      await fs.writeFile(afterFile, text.replace(/\/index\.md/g, ".md"))
    }

    if (file.isDirectory()) {
      await genSideBar(path.resolve(dir, file.name))
    }
  }

  await fs.writeFile(path.resolve(dir, "_meta.json"), JSON.stringify(sideBar))
}

type SideMetaItem =
  | string
  | {
      type: "file"
      name: string
      label?: string
      tag?: string
      overviewHeaders?: number[]
      context?: string
    }
  | {
      type: "dir"
      name: string
      label?: string
      collapsible?: boolean
      collapsed?: boolean
      tag?: string
      overviewHeaders?: number[]
      context?: string
    }
  | {
      type: "divider"
      dashed?: boolean
    }
  | {
      type: "section-header"
      label: string
      tag?: string
    }
