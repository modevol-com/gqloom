import { integer, pgTable, primaryKey, serial, text } from "drizzle-orm/pg-core"
import { drizzleSilk } from "../../src"

export const users = drizzleSilk(
  pgTable("users", {
    id: serial().primaryKey(),
    name: text().notNull(),
    age: integer(),
    email: text(),
  }),
  {
    name: "User",
    description: "A user",
    fields: {
      name: { description: "The name of the user" },
    },
  }
)

export const posts = drizzleSilk(
  pgTable("posts", {
    id: serial().primaryKey(),
    title: text().notNull(),
    content: text(),
    authorId: integer().references(() => users.id, { onDelete: "cascade" }),
  }),
  {
    name: "Post",
    description: "A post",
    fields: {
      title: { description: "The title of the post" },
    },
  }
)

export const userStarPosts = pgTable(
  "userStarPosts",
  {
    userId: integer().references(() => users.id),
    postId: integer().references(() => posts.id),
  },
  (t) => [primaryKey({ columns: [t.userId, t.postId] })]
)
