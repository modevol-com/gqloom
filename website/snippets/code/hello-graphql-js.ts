import { createServer } from "node:http"
import { query, resolver, silk, weave } from "@gqloom/core"
import { GraphQLNonNull, GraphQLString } from "graphql"
import { createYoga } from "graphql-yoga"

const helloResolver = resolver({
  hello: query(silk(new GraphQLNonNull(GraphQLString)))
    .input({ name: silk(GraphQLString) })
    .resolve(({ name }) => `Hello, ${name ?? "World"}!`),
})

const schema = weave(helloResolver)

const yoga = createYoga({ schema })
const server = createServer(yoga)
server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
