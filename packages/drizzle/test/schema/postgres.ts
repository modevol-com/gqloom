import * as t from "drizzle-orm/pg-core"
import { drizzleSilk } from "../../src"

export const user = drizzleSilk(
  t.pgTable("user", {
    id: t.serial().primaryKey(),
    name: t.text().notNull(),
    age: t.integer(),
    email: t.text(),
  })
)

export const post = drizzleSilk(
  t.pgTable("post", {
    id: t.serial().primaryKey(),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.integer().references(() => user.id, { onDelete: "cascade" }),
  })
)
