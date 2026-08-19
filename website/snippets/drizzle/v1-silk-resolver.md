```ts title="resolver.ts"
import { field, query, resolver } from "@gqloom/core"
import { useSelectedColumns } from "@gqloom/drizzle/context"
import { eq, inArray } from "drizzle-orm"
import { drizzle } from "drizzle-orm/libsql"
import * as v from "valibot"
import * as schema from "./schema"
import { posts, users } from "./schema"

const db = drizzle({
  schema,
  connection: { url: process.env.DB_FILE_NAME! },
})

export const usersResolver = resolver.of(users, {
  user: query
    .output(users.$nullable())
    .input({ id: v.number() })
    .resolve(({ id }) => {
      return db
        .select(useSelectedColumns(users))
        .from(users)
        .where(eq(users.id, id))
        .get()
    }),

  users: query.output(users.$list()).resolve(() => {
    return db.select(useSelectedColumns(users)).from(users).all()
  }),

  posts: field
    .output(posts.$list())
    .derivedFrom("id")
    .load(async (userList) => {
      const postList = await db
        .select()
        .from(posts)
        .where(
          inArray(
            users.id,
            userList.map((user) => user.id)
          )
        )
      const groups = new Map<number, (typeof posts.$inferSelect)[]>()

      for (const post of postList) {
        const key = post.authorId
        if (key == null) continue
        groups.set(key, [...(groups.get(key) ?? []), post])
      }
      return userList.map((user) => groups.get(user.id) ?? [])
    }),
})
```
