import { createServer } from "node:http"
import { field, query, resolver, weave } from "@gqloom/core"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import { createYoga } from "graphql-yoga"
import { config } from "../env.config"
import * as tables from "./schema"
import { posts, users } from "./schema"

const db = drizzle(config.databaseUrl, { schema: tables, logger: true })

const userResolver = resolver.of(users, {
  users: query(users.$list()).resolve(() => db.select().from(users)),

  posts0: field(posts.$list())
    .derivedFrom("id")
    .resolve((user) =>
      db.select().from(posts).where(eq(posts.authorId, user.id))
    ),

  // posts: field(posts.$list()).load(async (userList) => {
  //   const postList = await db
  //     .select()
  //     .from(posts)
  //     .where(
  //       inArray(
  //         posts.authorId,
  //         userList.map((u) => u.id)
  //       )
  //     )
  //   const postMap = Map.groupBy(postList, (p) => p.authorId)
  //   return userList.map((u) => postMap.get(u.id) ?? [])
  // }),
})

const schema = weave(userResolver)

const yoga = createYoga({ schema })
const server = createServer(yoga)
server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
