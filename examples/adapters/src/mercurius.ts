import { weave } from "@gqloom/core"
import Fastify from "fastify"
import mercurius from "mercurius"
import { helloResolver } from "./resolvers"

const schema = weave(helloResolver)

const app = Fastify()
app.register(mercurius, { schema })
app.listen({ port: 4000 }, () => {
  console.info("Mercurius server is running on http://localhost:4000")
})
