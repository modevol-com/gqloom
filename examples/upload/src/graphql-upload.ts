import * as fs from "node:fs"
import { createWriteStream } from "node:fs"
import { createServer } from "node:http"
import * as path from "node:path"
import { pipeline } from "node:stream/promises"
import { fileURLToPath } from "node:url"
import { mutation, resolver, silk, weave } from "@gqloom/core"
import { ValibotWeaver } from "@gqloom/valibot"
import { GraphQLNonNull, printSchema } from "graphql"
import { type FileUpload, GraphQLUpload } from "graphql-upload-minimal"
import { createYoga } from "graphql-yoga"
import * as v from "valibot"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const Upload = silk<Promise<FileUpload>>(new GraphQLNonNull(GraphQLUpload))

const uploadResolver = resolver({
  upload: mutation(v.string())
    .input({
      fileName: v.nullish(v.string()),
      file: Upload,
    })
    .resolve(async ({ fileName, file }) => {
      const { filename, createReadStream } = await file
      const name = fileName ?? filename
      const rs = createReadStream()
      const ws = createWriteStream(path.join(__dirname, "uploads", name))
      await pipeline(rs, ws)
      return `file uploaded: ${name}`
    }),
})

const schema = weave(ValibotWeaver, uploadResolver)

// Write schema to file in development
if (process.env.NODE_ENV !== "production") {
  fs.writeFileSync(
    path.resolve(__dirname, "../schema.graphql"),
    printSchema(schema)
  )
}

const yoga = createYoga({ schema })
const server = createServer(yoga)
server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
