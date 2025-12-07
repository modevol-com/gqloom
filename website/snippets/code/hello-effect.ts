import { createServer } from "node:http"
import { query, resolver, weave } from "@gqloom/core"
import { EffectWeaver } from "@gqloom/effect"
import { Schema } from "effect"
import { createYoga } from "graphql-yoga"

const standard = Schema.standardSchemaV1

const helloResolver = resolver({
  hello: query(standard(Schema.String))
    .input({
      name: standard(Schema.NullishOr(Schema.String)),
    })
    .resolve(({ name }) => `Hello, ${name ?? "World"}!`),
})

const schema = weave(EffectWeaver, helloResolver)

const yoga = createYoga({ schema })
const server = createServer(yoga)
server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
