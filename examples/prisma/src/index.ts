import { resolver, query, weave } from "@gqloom/valibot"
import * as v from "valibot"
import { createServer } from "node:http"
import { createYoga } from "graphql-yoga"
import * as g from "./generated/gqloom"
import { PrismaClient, type Prisma } from "@prisma/client"

const HelloResolver = resolver({
  hello: query(v.string(), () => "Hello, World"),

  user: query(g.User.nullable(), () => null),
})

export const schema = weave(HelloResolver)

const yoga = createYoga({ schema })

createServer(yoga).listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
