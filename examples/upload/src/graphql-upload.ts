import * as fs from "node:fs"
import { createWriteStream } from "node:fs"
import * as fsPromises from "node:fs/promises"
import * as path from "node:path"
import { pipeline } from "node:stream/promises"
import { fileURLToPath } from "node:url"
import { mutation, query, resolver, silk, weave } from "@gqloom/core"
import { ValibotWeaver } from "@gqloom/valibot"
import fastify from "fastify"
import { GraphQLNonNull, printSchema } from "graphql"
import { type FileUpload, GraphQLUpload } from "graphql-upload-minimal"
import mercurius from "mercurius"
import mercuriusUpload from "mercurius-upload"
import * as v from "valibot"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const Upload = silk<Promise<FileUpload>>(new GraphQLNonNull(GraphQLUpload))

const uploadResolver = resolver({
  hello: query(v.string())
    .input({ name: v.nullish(v.string(), "World") })
    .resolve(({ name }) => `Hello, ${name}!`),

  upload: mutation(v.string())
    .input({
      fileName: v.nullish(v.string()),
      file: Upload,
    })
    .resolve(async ({ fileName, file }) => {
      const { filename, createReadStream } = await file
      const name = fileName ?? filename
      const uploadsDir = path.join(__dirname, "uploads")
      await fsPromises.mkdir(uploadsDir, { recursive: true })
      const rs = createReadStream()
      const ws = createWriteStream(path.join(uploadsDir, name))
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

// Convert GQLoom resolvers to Mercurius format
const resolvers = {
  Upload: GraphQLUpload,
  Query: {
    hello: async (_: any, { name = "World" }: { name?: string }) => {
      return `Hello, ${name}!`
    },
  },
  Mutation: {
    upload: async (
      _: any,
      { fileName, file }: { fileName?: string; file: Promise<FileUpload> }
    ) => {
      const { filename, createReadStream } = await file
      const name = fileName ?? filename
      const uploadsDir = path.join(__dirname, "uploads")
      await fsPromises.mkdir(uploadsDir, { recursive: true })
      const rs = createReadStream()
      const ws = createWriteStream(path.join(uploadsDir, name))
      await pipeline(rs, ws)
      return `file uploaded: ${name}`
    },
  },
}

const app = fastify()

app.register(mercuriusUpload)

app.register(mercurius, {
  schema,
  resolvers,
  graphiql: true,
})

app.listen({ port: 4000 }, (err) => {
  if (err) {
    // biome-ignore lint/suspicious/noConsole: catch clause
    console.error(err)
    process.exit(1)
  }
  console.info("Server is running on http://localhost:4000/graphql")
})
