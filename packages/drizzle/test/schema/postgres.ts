import { relations } from "drizzle-orm"
import * as t from "drizzle-orm/pg-core"
import { drizzleSilk } from "../../src"

export const user = drizzleSilk(
  t.pgTable("drizzle_user", {
    id: t.serial().primaryKey(),
    name: t.text().notNull(),
    age: t.integer(),
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
  t.pgTable("drizzle_post", {
    id: t.serial().primaryKey(),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.integer().references(() => user.id, { onDelete: "cascade" }),
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
