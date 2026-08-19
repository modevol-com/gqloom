```ts [resolver.ts]
import { EasyDataLoader, field, query, resolver } from "@gqloom/core"
import { createMemoization } from "@gqloom/core/context"
import { drizzleResolverFactory } from "@gqloom/drizzle"
import { eq, inArray } from "drizzle-orm"
import { drizzle } from "drizzle-orm/libsql"
import * as v from "valibot"
import * as schema from "./schema"
import { posts, users } from "./schema"

const db = drizzle({
  schema,
  connection: { url: process.env.DB_FILE_NAME! },
})

const usersResolverFactory = drizzleResolverFactory(db, users)

const usePostsLoader = createMemoization( // [!code --]
  () => // [!code --]
    new EasyDataLoader< // [!code --]
      { id: number }, // [!code --]
      (typeof posts.$inferSelect)[] // [!code --]
    >(async (userList) => { // [!code --]
      const postList = await db // [!code --]
        .select() // [!code --]
        .from(posts) // [!code --]
        .where( // [!code --]
          inArray( // [!code --]
            users.id, // [!code --]
            userList.map((user) => user.id) // [!code --]
          ) // [!code --]
        ) // [!code --]
      const groups = new Map<number, (typeof posts.$inferSelect)[]>() // [!code --]
      // [!code --]
      for (const post of postList) { // [!code --]
        const key = post.authorId // [!code --]
        if (key == null) continue // [!code --]
        groups.set(key, [...(groups.get(key) ?? []), post]) // [!code --]
      } // [!code --]
      return userList.map((user) => groups.get(user.id) ?? []) // [!code --]
    }) // [!code --]
) // [!code --]

export const usersResolver = resolver.of(users, {
  user: query
    .output(users.$nullable())
    .input({ id: v.number() })
    .resolve(({ id }) => {
      return db.select().from(users).where(eq(users.id, id)).get()
    }),

  users: query.output(users.$list()).resolve(() => {
    return db.select().from(users).all()
  }),

  posts_: field.output(posts.$list()) // [!code --]
    .derivedFrom('id') // [!code --]
    .resolve((user) => { // [!code --]
      return usePostsLoader().load(user) // [!code --]
    }), // [!code --]

  posts: usersResolverFactory.relationField("posts"), // [!code ++]
})
```
