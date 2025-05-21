import { createServer } from "node:http"
import { weave } from "@gqloom/core"
import { ValibotWeaver } from "@gqloom/valibot"
import { createYoga } from "graphql-yoga"
import { resolvers } from "./resolvers"

const schema = weave(asyncContextProvider, ValibotWeaver, ...resolvers)

const yoga = createYoga({ schema })
createServer(yoga).listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})

import * as fs from "fs"
import * as path from "path"
import { asyncContextProvider } from "@gqloom/core/context"
import { printSchema } from "graphql"
if (process.env.NODE_ENV !== "production") {
  fs.writeFileSync(
    path.resolve(__dirname, "../schema.graphql"),
    printSchema(schema)
  )
}
