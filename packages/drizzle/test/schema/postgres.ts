import * as t from "drizzle-orm/pg-core"
import { drizzleSilk } from "../../src"

export const user = drizzleSilk(
  t.pgTable("drizzle_user", {
    id: t.serial(),
    name: t.text().notNull(),
    age: t.integer(),
    email: t.text(),
  })
)
