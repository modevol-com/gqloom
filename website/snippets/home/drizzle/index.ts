// @paths: {"src/*": ["snippets/home/drizzle/*"]}
import { createServer } from "node:http"
import { weave } from "@gqloom/core"
import { drizzleResolverFactory } from "@gqloom/drizzle"
import { drizzle } from "drizzle-orm/node-postgres"
import { createYoga } from "graphql-yoga"
import { Post, User } from "src/schema"

const db = drizzle(process.env.DATABASE_URL!, {
  schema: { users: User, posts: Post },
})

const userResolver = drizzleResolverFactory(db, User).resolver()
const postResolver = drizzleResolverFactory(db, Post).resolver()

const schema = weave(userResolver, postResolver)

const yoga = createYoga({ schema })
const server = createServer(yoga)
server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
