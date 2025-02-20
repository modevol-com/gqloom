import { weave } from "@gqloom/core"
import { graphqlServer } from "@hono/graphql-server"
import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { helloResolver } from "./resolvers"

export const app = new Hono()

const schema = weave(helloResolver)

app
  .get("/", (c) => c.text("Hello Node.js!"))
  .use("/graphql", graphqlServer({ schema, graphiql: true }))

serve(app, (info) => {
  console.info(`GraphQL server is running on http://localhost:${info.port}`)
})
