import { relations } from "drizzle-orm"
import * as t from "drizzle-orm/sqlite-core"
import { drizzleSilk } from "../../src"

export const user = drizzleSilk(
  t.sqliteTable("user", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    age: t.int(),
    email: t.text(),
  })
)

export const usersRelations = relations(user, ({ many }) => ({
  posts: many(post),
}))

export const post = drizzleSilk(
  t.sqliteTable("post", {
    id: t.int().primaryKey({ autoIncrement: true }),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.int().references(() => user.id),
  })
)

export const postsRelations = relations(post, ({ one }) => ({
  author: one(user, {
    fields: [post.authorId],
    references: [user.id],
  }),
}))
