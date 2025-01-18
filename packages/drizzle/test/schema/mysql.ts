import * as t from "drizzle-orm/mysql-core"
import { drizzleSilk } from "../../src"

export const user = drizzleSilk(
  t.mysqlTable("drizzle_user", {
    id: t.int().primaryKey().autoincrement(),
    name: t.text().notNull(),
    age: t.int(),
    email: t.text(),
  })
)
