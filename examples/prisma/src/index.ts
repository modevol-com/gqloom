import { resolver, query, weave } from "@gqloom/valibot"
import * as v from "valibot"
import { createServer } from "node:http"
import { createYoga } from "graphql-yoga"
import * as g from "./generated/gqloom"
import { printSchema } from "graphql"
import * as fs from "fs"
import * as path from "path"
// import { PrismaClient, type Prisma } from "@prisma/client"

const HelloResolver = resolver({
  hello: query(v.string(), () => "Hello, World"),

  user: query(g.User.nullable(), () => null),
})

const schema = weave(HelloResolver)
fs.writeFileSync(path.join(__dirname, "../schema.graphql"), printSchema(schema))

const yoga = createYoga({ schema })
const server = createServer(yoga)
server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
