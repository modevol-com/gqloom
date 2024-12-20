import { sqliteTable as table } from "drizzle-orm/sqlite-core"
import * as t from "drizzle-orm/sqlite-core"
import { drizzleSilk } from "../../src"

export const usersTable = drizzleSilk(
  table("users_table", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    age: t.int().notNull(),
    email: t.text().notNull().unique(),
  })
)
