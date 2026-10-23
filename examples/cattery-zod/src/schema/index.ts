import { drizzleSilk } from "@gqloom/drizzle"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const users = drizzleSilk(
  sqliteTable("users", {
    id: integer().primaryKey({ autoIncrement: true }),
    name: text().notNull(),
    phone: text().notNull().unique(),
  })
)

export const cats = drizzleSilk(
  sqliteTable("cats", {
    id: integer().primaryKey({ autoIncrement: true }),
    name: text().notNull(),
    birthday: integer({ mode: "timestamp" }).notNull(),
    ownerId: integer()
      .notNull()
      .references(() => users.id),
  })
)
