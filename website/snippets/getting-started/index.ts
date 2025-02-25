// src/index.ts
import { createServer } from "node:http"
import { weave } from "@gqloom/core"
import { ValibotWeaver } from "@gqloom/valibot"
import { createYoga } from "graphql-yoga"
import { resolvers } from "./resolvers"

const schema = weave(ValibotWeaver, ...resolvers)

const yoga = createYoga({ schema })
createServer(yoga).listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
