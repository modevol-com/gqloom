import { createServer } from "node:http"
import { PrismaResolverFactory } from "@gqloom/prisma"
import { weave } from "@gqloom/valibot"
import { createYoga } from "graphql-yoga"
import { PrismaClient } from "./generated/client"
import { Post, User } from "./generated/gqloom"

const db = new PrismaClient()

const userResolver = new PrismaResolverFactory(User, db).resolver()
const postResolver = new PrismaResolverFactory(Post, db).resolver()

const schema = weave(userResolver, postResolver)

const yoga = createYoga({ schema })
const server = createServer(yoga)
server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
