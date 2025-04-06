import * as t from "drizzle-orm/mysql-core"
import { drizzleSilk } from "../../src"

export const user = drizzleSilk(
  t.mysqlTable("user", {
    id: t.int().primaryKey().autoincrement(),
    name: t.text().notNull(),
    age: t.int(),
    email: t.text(),
  })
)

export const post = drizzleSilk(
  t.mysqlTable("post", {
    id: t.int().primaryKey().autoincrement(),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.int().references(() => user.id, { onDelete: "cascade" }),
  })
)
