import * as t from "drizzle-orm/pg-core"
import { drizzleSilk } from "../../src"

export const users = drizzleSilk(
  t.pgTable("users", {
    id: t.serial().primaryKey(),
    name: t.text().notNull(),
    age: t.integer(),
    email: t.text(),
  })
)

export const posts = drizzleSilk(
  t.pgTable("posts", {
    id: t.serial().primaryKey(),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.integer().references(() => users.id, { onDelete: "cascade" }),
  })
)
