# 文件上传

`GQLoom` 可通过 GraphQL 的 Upload 标量支持文件上传。  
下面给出两种常见接入方式：  
- 使用 `graphql-upload` 或 `graphql-upload-minimal` 的 `GraphQLUpload` 标量
- 使用 `graphql-yoga` 提供的 `File` 类型

## 核心步骤
- 使用 `silk` 函数申明 `Upload` 或 `File` 标量。
- 在 `mutation` 的 `input` 中使用 `Upload` 或 `File` 标量。

## 使用 `GraphQLUpload`

以下代码示例适用于 `graphql-upload` 或 `graphql-upload-minimal`。

```ts twoslash
import { mutation, resolver, silk, weave } from "@gqloom/core"
import { ValibotWeaver } from "@gqloom/valibot"
import { GraphQLNonNull } from "graphql"
import { type FileUpload, GraphQLUpload } from "graphql-upload-minimal"
import { createServer } from "node:http"
import { createWriteStream } from "node:fs"
import { pipeline } from "node:stream/promises"
import * as path from "node:path"
import { createYoga } from "graphql-yoga"
import * as v from "valibot"

const Upload = silk<Promise<FileUpload>>(new GraphQLNonNull(GraphQLUpload)) // [!code highlight]

const uploadResolver = resolver({
  upload: mutation(v.string())
    .input({
      fileName: v.nullish(v.string()),
      file: Upload, // [!code highlight]
    })
    .resolve(async ({ fileName, file }) => {
      const { filename, createReadStream } = await file
      const name = fileName ?? filename
      const uploadsDir = path.join(import.meta.dirname, "uploads")
      await fsPromises.mkdir(uploadsDir, { recursive: true })
      const rs = createReadStream()
      const ws = createWriteStream(path.join(uploadsDir, name))
      await pipeline(rs, ws)
      return `file uploaded: ${name}`
    }),
})
```

要点：
- `Upload` 使用 `Promise<FileUpload>`，需等待后再读 `createReadStream`。
- 还需要在适配器中添加对 `Upload` 的解析，具体查看：
  - [graphql-upload](https://github.com/jaydenseric/graphql-upload)
  - [graphql-upload-minimal](https://github.com/flash-oss/graphql-upload-minimal)
  - [mercurius-upload](https://github.com/mercurius-js/mercurius-upload)

## 使用 `File` 类型

以下代码示例适用于 `graphql-yoga` 的 `File` 类型。

```ts twoslash
import { mutation, resolver, silk, weave } from "@gqloom/core"
import { ValibotWeaver } from "@gqloom/valibot"
import { GraphQLNonNull, GraphQLScalarType } from "graphql"
import { createServer } from "node:http"
import * as path from "node:path"
import * as fs from "node:fs/promises"
import { createYoga } from "graphql-yoga"
import * as v from "valibot"

const FileScalar = silk( // [!code highlight]
  new GraphQLNonNull( // [!code highlight]
    new GraphQLScalarType<File, File>({ // [!code highlight]
      name: "File", // [!code highlight]
      description: "The `File` scalar type represents a file upload.", // [!code highlight]
    }) // [!code highlight]
  ) // [!code highlight]
) // [!code highlight]

const uploadResolver = resolver({
  upload: mutation(v.string())
    .input({
      fileName: v.nullish(v.string()),
      file: FileScalar, // [!code highlight]
    })
    .resolve(async ({ fileName, file }) => {
      const name = fileName ?? file.name
      const uploadsDir = path.join(import.meta.dirname, "uploads")
      await fsPromises.mkdir(uploadsDir, { recursive: true })
      await fsPromises.writeFile(
        path.join(uploadsDir, name),
        Buffer.from(await file.arrayBuffer())
      )
      return `file uploaded: ${name}`
    }),
})

const schema = weave(ValibotWeaver, uploadResolver)
const yoga = createYoga({ schema })
createServer(yoga).listen(4000)
```

要点：
- Yoga 提供的 `File` 直接支持 `arrayBuffer()`，适合中小文件或先落盘再处理。
- 同样通过 `silk` 包装为非空标量，按需补充校验与权限控制。
