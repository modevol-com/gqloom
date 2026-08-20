<Tabs groupId="drizzle-api-version">
<template #v2_(rc)>

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

</template>
<template #v1>

```ts twoslash title="resolver.ts"
// @paths: {"@gqloom/drizzle":["node_modules/@gqloom/drizzle-rqbv1/dist/index.d.ts"],"@gqloom/drizzle/context":["node_modules/@gqloom/drizzle-rqbv1/dist/context.d.ts"],"drizzle-orm":["node_modules/drizzle-orm-rqbv1/index.d.ts"],"drizzle-orm/sqlite-core":["node_modules/drizzle-orm-rqbv1/sqlite-core/index.d.ts"],"drizzle-orm/libsql":["node_modules/drizzle-orm-rqbv1/libsql/index.d.ts"]}
// @filename: schema.ts
import { drizzleSilk } from "@gqloom/drizzle"
import { relations } from "drizzle-orm"
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

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}))

export const posts = drizzleSilk(
  t.sqliteTable("posts", {
    id: t.int().primaryKey({ autoIncrement: true }),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.int().references(() => users.id, { onDelete: "cascade" }),
  })
)

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}))
// @filename: resolver.ts
// ---cut---
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

</template>
</Tabs>
