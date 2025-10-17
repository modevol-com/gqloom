import { createServer } from "node:http"
import { query, resolver, type SchemaWeaver, weave } from "@gqloom/core"
import { type JSONSchema, JSONWeaver } from "@gqloom/json"
import { type Type, type } from "arktype"
import { createYoga } from "graphql-yoga"

const helloResolver = resolver({
  hello: query(type("string"))
    .input(type({ "name?": "string | null" }))
    .resolve(({ name }) => `Hello, ${name ?? "World"}!`),
})

const arktypeWeaver: SchemaWeaver = {
  vendor: "arktype",
  getGraphQLType: (type: Type) => {
    return JSONWeaver.getGraphQLType(type.toJsonSchema() as JSONSchema, {
      source: type,
    })
  },
}

const schema = weave(arktypeWeaver, helloResolver)

const yoga = createYoga({ schema })
const server = createServer(yoga)
server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
