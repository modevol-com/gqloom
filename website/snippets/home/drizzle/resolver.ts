// @paths: {"src/*": ["snippets/home/drizzle/*"]}
import { field, query, resolver } from "@gqloom/core"
import { useSelectedColumns } from "@gqloom/drizzle/context"
import { eq, inArray } from "drizzle-orm"
import { Post, User } from "src/schema"
import * as v from "valibot"

export const userResolver = resolver.of(User, {
  user: query(User.$nullable()) // Declare a query that returns a user
    .input({ id: v.number() }) // This query accepts an `id` as parameter
    .resolve(async ({ id }) => {
      const [user] = await db
        .select(useSelectedColumns(User)) // Select only the columns that are being queried
        .from(User)
        .where(eq(User.id, id))
      return user
    }),

  posts: field(Post.$list()) // Declare a derived field that returns a list of posts
    .derivedFrom("id") // This field depends on the `id` field
    .load(async (users) => {
      const postList = await db
        .select(useSelectedColumns(Post)) // Select only the columns that are being queried
        .from(Post)
        .where(
          inArray(
            Post.authorId,
            users.map((u) => u.id)
          )
        )
      const postMap = Map.groupBy(postList, (p) => p.authorId)
      return users.map((u) => postMap.get(u.id) ?? [])
    }),
})

// ---cut-after---

import { drizzle } from "drizzle-orm/node-postgres"

const db = drizzle(process.env.DATABASE_URL!)
