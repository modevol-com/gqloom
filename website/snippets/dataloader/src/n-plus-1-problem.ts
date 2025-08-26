// @paths: {"src/*": ["snippets/dataloader/src/*"]}
import { field, query, resolver } from "@gqloom/core"
import { eq } from "drizzle-orm"
import { db } from "src/db"
import { posts, users } from "src/schema"

export const userResolver = resolver.of(users, {
  users: query(users.$list()).resolve(() => db.select().from(users)),

  posts: field(posts.$list())
    .derivedFrom("id")
    .resolve((user) =>
      db.select().from(posts).where(eq(posts.authorId, user.id))
    ),
})
