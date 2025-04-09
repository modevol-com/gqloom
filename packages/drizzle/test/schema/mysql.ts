import * as t from "drizzle-orm/mysql-core"
import { drizzleSilk } from "../../src"

export const users = drizzleSilk(
  t.mysqlTable("users", {
    id: t.int().primaryKey().autoincrement(),
    name: t.text().notNull(),
    age: t.int(),
    email: t.text(),
  })
)

export const posts = drizzleSilk(
  t.mysqlTable("posts", {
    id: t.int().primaryKey().autoincrement(),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.int().references(() => users.id, { onDelete: "cascade" }),
  })
)
