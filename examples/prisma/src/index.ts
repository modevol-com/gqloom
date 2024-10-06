import { resolver, query, weave, field } from "@gqloom/valibot"
import * as v from "valibot"
import { createServer } from "node:http"
import { createYoga } from "graphql-yoga"
import * as g from "./generated/gqloom"
import { printSchema } from "graphql"
import * as fs from "fs"
import * as path from "path"
import { PrismaClient } from "@prisma/client"

const db = new PrismaClient({ log: ["query"] })

const HelloResolver = resolver({
  hello: query(v.string(), () => "Hello, World"),
})

const UserResolver = resolver.of(g.User, {
  user: query(g.User.nullable(), () => null),

  posts: field(g.Post.list(), (user) => {
    return db.post.findMany({ where: { authorId: { in: [user.id] } } })
  }),
})

const schema = weave(HelloResolver, UserResolver)
fs.writeFileSync(path.join(__dirname, "../schema.graphql"), printSchema(schema))

const yoga = createYoga({ schema })
const server = createServer(yoga)
server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
