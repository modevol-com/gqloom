import { relations } from "drizzle-orm"
import * as t from "drizzle-orm/mysql-core"
import { drizzleSilk } from "../../src"

export const user = drizzleSilk(
  t.mysqlTable("drizzle_user", {
    id: t.int().primaryKey().autoincrement(),
    name: t.text().notNull(),
    age: t.int(),
    email: t.text(),
  }),
  {
    name: "User",
    description: "A user",
    fields: {
      name: { description: "The name of the user" },
    },
  }
)

export const usersRelations = relations(user, ({ many }) => ({
  posts: many(post),
}))

export const post = drizzleSilk(
  t.mysqlTable("drizzle_post", {
    id: t.int().primaryKey().autoincrement(),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.int().references(() => user.id, { onDelete: "cascade" }),
  }),
  {
    name: "Post",
    description: "A post",
    fields: {
      title: { description: "The title of the post" },
    },
  }
)

export const postsRelations = relations(post, ({ one }) => ({
  author: one(user, {
    fields: [post.authorId],
    references: [user.id],
  }),
}))
