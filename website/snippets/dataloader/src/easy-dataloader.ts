// @paths: {"src/*": ["snippets/dataloader/src/*"]}
import { EasyDataLoader, field, resolver } from "@gqloom/core"
import { createMemoization } from "@gqloom/core/context"
import { inArray } from "drizzle-orm"
import { db } from "src/db"
import { posts, users } from "src/schema"

const useUserLoader = createMemoization(() => {
  return new EasyDataLoader<number, typeof users.$inferSelect>(async (keys) => {
    const userList = await db
      .select()
      .from(users)
      .where(inArray(users.id, keys))
    const userMap = new Map(userList.map((u) => [u.id, u]))
    return keys.map(
      (key) => userMap.get(key) ?? new Error(`User ${key} not found`)
    )
  })
})

// The usage in the resolver remains the same
export const postResolver = resolver.of(posts, {
  author: field(users)
    .derivedFrom("authorId")
    .resolve((post) => {
      const loader = useUserLoader()
      return loader.load(post.authorId)
    }),
})
