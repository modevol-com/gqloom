import { createServer } from "node:http"
import { weave } from "@gqloom/core"
import { createYoga } from "graphql-yoga"
import { helloResolver } from "./resolvers"

const schema = weave(helloResolver)

const yoga = createYoga({ schema })

createServer(yoga).listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
