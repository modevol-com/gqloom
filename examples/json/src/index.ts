import { createServer } from "node:http"
import { query, resolver, weave } from "@gqloom/core"
import { jsonSilk } from "@gqloom/json"
import { createYoga } from "graphql-yoga"
import { inputValidator } from "./validator"

const helloResolver = resolver({
  hello: query(jsonSilk({ type: "string" }))
    .input(
      jsonSilk({
        type: "object",
        properties: { name: { type: "string", minLength: 2 } },
      })
    )
    .resolve(({ name }) => `Hello, ${name ?? "World"}!`),
})

const schema = weave(helloResolver, inputValidator)

const yoga = createYoga({ schema })
const server = createServer(yoga)
server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
