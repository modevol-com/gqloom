// @paths: {"src/*": ["snippets/guide-zod/src/*"]}
import { createServer } from "node:http"
import { weave } from "@gqloom/core"
import { asyncContextProvider } from "@gqloom/core/context" // [!code ++]
import { ZodWeaver } from "@gqloom/zod"
import { createYoga } from "graphql-yoga"
import { resolvers } from "src/resolvers"

const schema = weave(asyncContextProvider, ZodWeaver, ...resolvers) // [!code ++]

const yoga = createYoga({ schema })
createServer(yoga).listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
