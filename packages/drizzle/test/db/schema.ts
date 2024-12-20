import { DrizzleWeaver } from "@gqloom/drizzle"
import {} from "drizzle-orm"
import { sqliteTable as table } from "drizzle-orm/sqlite-core"
import * as t from "drizzle-orm/sqlite-core"

export const usersTable = table("users_table", {
  id: t.int().primaryKey({ autoIncrement: true }),
  name: t.text().notNull(),
  age: t.int().notNull(),
  email: t.text().notNull().unique(),
})

console.log(Object.keys(usersTable))

const useTableSilk = DrizzleWeaver.unravel(usersTable)
console.log(Object.keys(useTableSilk))
