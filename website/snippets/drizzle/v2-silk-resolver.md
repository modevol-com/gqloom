```ts twoslash title="resolver.ts"
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
// ---cut---
import { field, query, resolver } from "@gqloom/core"
import { useSelectedColumns } from "@gqloom/drizzle/context"
import { eq, inArray } from "drizzle-orm"
import { drizzle } from "drizzle-orm/libsql"
import * as v from "valibot"
import { relations } from "./relations"
import { posts, users } from "./schema"

const db = drizzle({
  relations,
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
