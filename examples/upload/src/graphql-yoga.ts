import * as fs from "node:fs"
import * as fsPromises from "node:fs/promises"
import { createServer } from "node:http"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { mutation, query, resolver, silk, weave } from "@gqloom/core"
import { ValibotWeaver } from "@gqloom/valibot"
import { GraphQLNonNull, GraphQLScalarType, printSchema } from "graphql"
import { createYoga } from "graphql-yoga"
import * as v from "valibot"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const File = silk(
  new GraphQLNonNull(
    new GraphQLScalarType<File, File>({
      name: "File",
      description: "The `File` scalar type represents a file upload.",
    })
  )
)

const helloResolver = resolver({
  hello: query(v.string())
    .input({ name: v.nullish(v.string(), "World") })
    .resolve(({ name }) => `Hello, ${name}!`),

  upload: mutation(v.string())
    .input({
      fileName: v.nullish(v.string()),
      file: File,
    })
    .resolve(async ({ fileName, file }) => {
      const name = fileName ?? file.name
      await fsPromises.writeFile(
        path.join(__dirname, "uploads", name),
        Buffer.from(await file.arrayBuffer())
      )
      return `file uploaded: ${name}`
    }),
})

const schema = weave(ValibotWeaver, helloResolver)

// Write schema to file in development
if (process.env.NODE_ENV !== "production") {
  fs.writeFileSync(
    path.resolve(__dirname, "../yoga-schema.graphql"),
    printSchema(schema)
  )
}

const yoga = createYoga({ schema })
const server = createServer(yoga)
server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
