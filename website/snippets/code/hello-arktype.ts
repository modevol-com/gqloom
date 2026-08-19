import { createServer } from "node:http"
import { query, resolver, weave } from "@gqloom/core"
import { JSONWeaver } from "@gqloom/json"
import { type } from "arktype"
import { createYoga } from "graphql-yoga"

const helloResolver = resolver({
  hello: query(type("string"))
    .input(type({ "name?": "string | null" }))
    .resolve(({ name }) => `Hello, ${name ?? "World"}!`),
})

const schema = weave(JSONWeaver, helloResolver)

const yoga = createYoga({ schema })
const server = createServer(yoga)
server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
