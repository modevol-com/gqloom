// @paths: {"src/*": ["snippets/dataloader/src/*"]}
import { drizzleSilk } from "@gqloom/drizzle"
import { defineRelations } from "drizzle-orm"
import * as t from "drizzle-orm/pg-core"

export const roleEnum = t.pgEnum("role", ["user", "admin"])

export const users = drizzleSilk(
  t.pgTable("users", {
    id: t.serial().primaryKey(),
    createdAt: t.timestamp().defaultNow(),
    email: t.text().unique().notNull(),
    name: t.text(),
    role: roleEnum().default("user"),
  })
)

export const posts = drizzleSilk(
  t.pgTable("posts", {
    id: t.serial().primaryKey(),
    createdAt: t.timestamp().defaultNow(),
    updatedAt: t
      .timestamp()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
    published: t.boolean().default(false),
    title: t.varchar({ length: 255 }).notNull(),
    authorId: t.integer().notNull(),
  })
)

export const relations = defineRelations({ users, posts }, (r) => ({
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
