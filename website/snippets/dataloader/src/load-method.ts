// @paths: {"src/*": ["snippets/dataloader/src/*"]}
import { field, resolver } from "@gqloom/core"
import { inArray } from "drizzle-orm"
import { db } from "src/db"
import { posts, users } from "src/schema"

export const userResolver = resolver.of(users, {
  posts: field(posts.$list())
    .derivedFrom("id")
    .load(async (userList) => {
      // 1. Fetch all posts for the users at once
      const postList = await db
        .select()
        .from(posts)
        .where(
          inArray(
            posts.authorId,
            userList.map((u) => u.id)
          )
        )
      // 2. Group posts by authorId
      const grouped = Map.groupBy(postList, (p) => p.authorId)
      // 3. Map the posts back to each user in order
      return userList.map((u) => grouped.get(u.id) ?? [])
    }),
})
