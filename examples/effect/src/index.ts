import { createServer } from "node:http"
import { fileURLToPath } from "node:url"
import { weave } from "@gqloom/core"
import { EffectWeaver } from "@gqloom/effect"
import * as fs from "fs"
import { printSchema } from "graphql"
import { createYoga } from "graphql-yoga"
import * as path from "path"
import { resolvers } from "./resolvers"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const schema = weave(EffectWeaver, ...resolvers)

// Write schema to file in development
if (process.env.NODE_ENV !== "production") {
  fs.writeFileSync(
    path.resolve(__dirname, "../schema.graphql"),
    printSchema(schema)
  )
}

const yoga = createYoga({ schema })
createServer(yoga).listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
