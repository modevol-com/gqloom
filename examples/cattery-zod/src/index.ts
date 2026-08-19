import { createServer } from "node:http"
import { weave } from "@gqloom/core"
import { asyncContextProvider } from "@gqloom/core/context"
import { ZodWeaver } from "@gqloom/zod"
import { createYoga } from "graphql-yoga"
import { resolvers } from "./resolvers"

const schema = weave(asyncContextProvider, ZodWeaver, ...resolvers)

const yoga = createYoga({ schema })
createServer(yoga).listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})

import * as fs from "fs"
import { printSchema } from "graphql"
import * as path from "path"

if (process.env.NODE_ENV !== "production") {
  fs.writeFileSync(
    path.resolve(__dirname, "../schema.graphql"),
    printSchema(schema)
  )
}
