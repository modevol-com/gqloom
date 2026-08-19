import { createServer } from "node:http"
import { type GraphQLSilk, query, resolver, weave } from "@gqloom/core"
import { JSONWeaver } from "@gqloom/json"
import { createYoga } from "graphql-yoga"
import Type from "typebox"

const helloResolver = resolver({
  hello: query(typeSilk(Type.String()))
    .input({ name: typeSilk(Type.String()) })
    .resolve(({ name }) => `Hello, ${name ?? "World"}!`),
})

const schema = weave(helloResolver)

const yoga = createYoga({ schema })
const server = createServer(yoga)
server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})

function typeSilk<T extends Type.TSchema>(
  type: T
): T & GraphQLSilk<Type.Static<T>, Type.Static<T>> {
  return JSONWeaver.unravel(type) as T &
    GraphQLSilk<Type.Static<T>, Type.Static<T>>
}
