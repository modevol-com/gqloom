// @paths: {"src/*": ["snippets/dataloader/src/*"]}
import { field, LoomDataLoader, query, resolver } from "@gqloom/core"
import { createMemoization } from "@gqloom/core/context"
import { inArray } from "drizzle-orm"
import { db } from "src/db"
import { posts, users } from "src/schema"
import * as v from "valibot"

// 1. Create a custom DataLoader
export class UserLoader extends LoomDataLoader<
  number,
  typeof users.$inferSelect
> {
  protected async batchLoad(
    keys: number[]
  ): Promise<(typeof users.$inferSelect | Error)[]> {
    const userList = await db
      .select()
      .from(users)
      .where(inArray(users.id, keys))
    const userMap = new Map(userList.map((u) => [u.id, u]))
    return keys.map(
      (key) => userMap.get(key) ?? new Error(`User ${key} not found`)
    )
  }
}

// 2. Use createMemoization to create a shared loader instance within the request
export const useUserLoader = createMemoization(() => new UserLoader())

// 3. Use it in the resolver
export const postResolver = resolver.of(posts, {
  author: field(users)
    .derivedFrom("authorId")
    .resolve((post) => {
      const loader = useUserLoader()
      return loader.load(post.authorId)
    }),
})

export const userResolver = resolver.of(users, {
  user: query(users)
    .input({ id: v.number() })
    .resolve(({ id }) => {
      const loader = useUserLoader()
      return loader.load(id)
    }),
})
