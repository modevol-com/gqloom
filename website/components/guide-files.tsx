import { cn } from "@/css"
import { Icon } from "@iconify/vue"
import { type FlattenedItem, TreeItem, TreeRoot } from "reka-ui"
import { defineComponent } from "vue"

interface FileItem {
  title: string
  icon: string
  children?: FileItem[]
}

interface FileItemWithPath extends FileItem {
  path: string
  children?: FileItemWithPath[]
}

const files: FileItem[] = [
  {
    title: "src",
    icon: "lucide:folder",
    children: [
      {
        title: "contexts",
        icon: "lucide:folder",
        children: [
          { title: "index.ts", icon: "vscode-icons:file-type-typescript" },
        ],
      },
      {
        title: "providers",
        icon: "lucide:folder",
        children: [
          { title: "index.ts", icon: "vscode-icons:file-type-typescript" },
        ],
      },
      {
        title: "resolvers",
        icon: "lucide:folder",
        children: [
          { title: "cat.ts", icon: "vscode-icons:file-type-typescript" },
          { title: "index.ts", icon: "vscode-icons:file-type-typescript" },
          { title: "user.ts", icon: "vscode-icons:file-type-typescript" },
        ],
      },
      {
        title: "schema",
        icon: "lucide:folder",
        children: [
          { title: "index.ts", icon: "vscode-icons:file-type-typescript" },
        ],
      },
      { title: "index.ts", icon: "vscode-icons:file-type-typescript" },
    ],
  },
  { title: "drizzle.config.ts", icon: "vscode-icons:file-type-typescript" },
  { title: "package.json", icon: "vscode-icons:file-type-json" },
  { title: "tsconfig.json", icon: "vscode-icons:file-type-tsconfig" },
]

function addPath(items: FileItem[], parentPath = ""): FileItemWithPath[] {
  return items.map((item) => {
    const path = parentPath ? `${parentPath}/${item.title}` : item.title
    const newItem: FileItemWithPath = {
      title: item.title,
      icon: item.icon,
      path,
    }
    if (item.children) {
      newItem.children = addPath(item.children, path)
    }
    return newItem
  })
}

const filesWithPaths = addPath(files)

export const GuideFiles = defineComponent({
  setup() {
    return () => (
      <TreeRoot
        class="list-none select-none w-full bg-slate-50 dark:bg-slate-900 text-stone-700 dark:text-stone-300 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm !p-2 text-sm font-medium"
        items={filesWithPaths}
        getKey={(item) => item.path}
        defaultExpanded={["src"]}
        v-slots={{
          default: ({
            flattenItems,
          }: {
            flattenItems: FlattenedItem<FileItemWithPath>[]
          }) => {
            return flattenItems.map((item: FlattenedItem<FileItemWithPath>) => (
              <TreeItem
                key={item._id}
                style={{ "padding-left": `${item.level - 0.5}rem` }}
                {...item.bind}
                class={cn(
                  item.hasChildren && "cursor-pointer",
                  "flex items-center py-1 px-2 my-0.5 rounded outline-none focus:ring-pink-500 focus:ring-2 data-[selected]:bg-pink-100 dark:data-[selected]:bg-rose-500/20"
                )}
                v-slots={{
                  default: ({ isExpanded }: { isExpanded: boolean }) => (
                    <>
                      {item.hasChildren ? (
                        <>
                          {!isExpanded ? (
                            <Icon icon="lucide:folder" class="h-4 w-4" />
                          ) : (
                            <Icon icon="lucide:folder-open" class="h-4 w-4" />
                          )}
                        </>
                      ) : (
                        <Icon
                          icon={item.value.icon || "lucide:file"}
                          class="h-4 w-4"
                        />
                      )}
                      <div class="pl-2">{item.value.title}</div>
                    </>
                  ),
                }}
              />
            ))
          },
        }}
      />
    )
  },
})
