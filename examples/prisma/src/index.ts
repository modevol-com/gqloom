import * as fs from "fs"
import { createServer } from "node:http"
import * as path from "path"
import { PrismaResolverFactory } from "@gqloom/prisma"
import { ValibotWeaver, query, resolver, weave } from "@gqloom/valibot"
import { printSchema } from "graphql"
import { createYoga } from "graphql-yoga"
import * as v from "valibot"
import { PrismaClient } from "./generated/client"
import { Post, User } from "./generated/gqloom"

const db = new PrismaClient({ log: ["query"] })

const helloResolver = resolver({
  hello: query(v.string(), () => "Hello, World"),
})

const userResolver = new PrismaResolverFactory(User, db).resolver()
const postResolver = new PrismaResolverFactory(Post, db).resolver()

const schema = weave(helloResolver, userResolver, postResolver, ValibotWeaver)
fs.writeFileSync(path.join(__dirname, "../schema.graphql"), printSchema(schema))

const yoga = createYoga({ schema })
const server = createServer(yoga)
server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
