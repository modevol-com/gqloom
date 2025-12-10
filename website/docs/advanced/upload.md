# File Upload

`GQLoom` supports file uploads through GraphQL's Upload scalar.  
Below are two common integration approaches:  
- Using the `GraphQLUpload` scalar from `graphql-upload` or `graphql-upload-minimal`
- Using the `File` type provided by `graphql-yoga`

## Core Steps
- Use the `silk` function to declare the `Upload` or `File` scalar.
- Use the `Upload` or `File` scalar in the `input` of a `mutation`.

## Using `GraphQLUpload`

The following code example applies to `graphql-upload` or `graphql-upload-minimal`.

```ts twoslash
import { mutation, resolver, silk, weave } from "@gqloom/core"
import { ValibotWeaver } from "@gqloom/valibot"
import { GraphQLNonNull } from "graphql"
import { type FileUpload, GraphQLUpload } from "graphql-upload-minimal"
import { createServer } from "node:http"
import { createWriteStream } from "node:fs"
import { pipeline } from "node:stream/promises"
import * as path from "node:path"
import * as fsPromises from "node:fs/promises"
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

Key points:
- `Upload` uses `Promise<FileUpload>`, so you need to await it before reading `createReadStream`.
- You also need to add the parsing of `Upload` in the adapter, see:
  - [graphql-upload](https://github.com/jaydenseric/graphql-upload)
  - [graphql-upload-minimal](https://github.com/flash-oss/graphql-upload-minimal)
  - [mercurius-upload](https://github.com/mercurius-js/mercurius-upload)

## Using `File` Type

The following code example applies to the `File` type from `graphql-yoga`.

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
      await fs.mkdir(uploadsDir, { recursive: true })
      await fs.writeFile(
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

Key points:
- The `File` provided by Yoga directly supports `arrayBuffer()`, suitable for small to medium files or writing to disk before processing.
- Similarly, wrap it as a non-null scalar using `silk`, and add validation and permission control as needed.
