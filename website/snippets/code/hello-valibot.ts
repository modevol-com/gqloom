import { createServer } from "node:http"
import { query, resolver, weave } from "@gqloom/core"
import { ValibotWeaver } from "@gqloom/valibot"
import { createYoga } from "graphql-yoga"
import * as v from "valibot"

const helloResolver = resolver({
  hello: query(v.string())
    .input({ name: v.nullish(v.string(), "World") })
    .resolve(({ name }) => `Hello, ${name}!`),
})

const schema = weave(ValibotWeaver, helloResolver)

const yoga = createYoga({ schema })
const server = createServer(yoga)
server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
