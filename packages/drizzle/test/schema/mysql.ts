import { int, mysqlTable, primaryKey, text } from "drizzle-orm/mysql-core"
import { drizzleSilk } from "../../src"

export const users = drizzleSilk(
  mysqlTable("users", {
    id: int().primaryKey().autoincrement(),
    name: text().notNull(),
    age: int(),
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
  mysqlTable("posts", {
    id: int().primaryKey().autoincrement(),
    title: text().notNull(),
    content: text(),
    authorId: int().references(() => users.id, { onDelete: "cascade" }),
  }),
  {
    name: "Post",
    description: "A post",
    fields: {
      title: { description: "The title of the post" },
    },
  }
)

export const userStarPosts = mysqlTable(
  "userStarPosts",
  {
    userId: int("user_id").references(() => users.id),
    postId: int("post_id").references(() => posts.id),
  },
  (t) => [primaryKey({ columns: [t.userId, t.postId] })]
)
