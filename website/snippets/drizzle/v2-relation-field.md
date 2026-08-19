```ts twoslash [resolver.ts]
// @filename: schema.ts
import { drizzleSilk } from "@gqloom/drizzle"
import * as t from "drizzle-orm/sqlite-core"

export const users = drizzleSilk(
  t.sqliteTable("users", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    age: t.int(),
    email: t.text(),
    password: t.text(),
  })
)

export const posts = drizzleSilk(
  t.sqliteTable("posts", {
    id: t.int().primaryKey({ autoIncrement: true }),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.int().references(() => users.id, { onDelete: "cascade" }),
  })
)
// @filename: relations.ts
import { defineRelations } from "drizzle-orm"
import * as tables from "./schema"

export const relations = defineRelations(tables, (r) => ({
  users: {
    posts: r.many.posts({
      from: r.users.id,
      to: r.posts.authorId,
    }),
  },
  posts: {
    author: r.one.users({
      from: r.posts.authorId,
      to: r.users.id,
    }),
  },
}))
// @filename: resolver.ts
import { field, EasyDataLoader } from "@gqloom/core"
import { createMemoization } from "@gqloom/core/context"
import { posts } from "schema"
// ---cut---
import { query, resolver } from "@gqloom/core"
import { drizzleResolverFactory } from "@gqloom/drizzle"
import { eq, inArray } from "drizzle-orm"
import { drizzle } from "drizzle-orm/libsql"
import * as v from "valibot"
import { relations } from "./relations"
import { users } from "./schema"

const db = drizzle({
  relations,
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
