import { createServer } from "node:http"
import { query, resolver, type SchemaWeaver, weave } from "@gqloom/core"
import { JSONWeaver } from "@gqloom/json"
import { make } from "effect/JSONSchema"
import * as Schema from "effect/Schema"
import { createYoga } from "graphql-yoga"

const helloResolver = resolver({
  hello: query(Schema.standardSchemaV1(Schema.String))
    .input(
      Schema.standardSchemaV1(
        Schema.Struct({ name: Schema.NullishOr(Schema.String) })
      )
    )
    .resolve(({ name }) => `Hello, ${name ?? "World"}!`),
})

const effectWeaver: SchemaWeaver = {
  vendor: "effect",
  getGraphQLType: (type: Schema.Schema<any, any, any>) => {
    return JSONWeaver.getGraphQLType(make(type), {
      source: type,
    })
  },
}

const schema = weave(effectWeaver, helloResolver)

const yoga = createYoga({ schema })
const server = createServer(yoga)
server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
