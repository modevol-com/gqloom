import { drizzleSilk } from "@gqloom/drizzle"
import { relations } from "drizzle-orm"
import * as t from "drizzle-orm/sqlite-core"

export const users = drizzleSilk(
  t.sqliteTable("users", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    phone: t.text().notNull().unique(),
  })
)

export const usersRelations = relations(users, ({ many }) => ({
  cats: many(cats),
}))

export const cats = drizzleSilk(
  t.sqliteTable("cats", {
    id: t.integer().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    birthday: t.integer({ mode: "timestamp" }).notNull(),
    ownerId: t
      .integer()
      .notNull()
      .references(() => users.id),
  })
)

export const catsRelations = relations(cats, ({ one }) => ({
  owner: one(users, {
    fields: [cats.ownerId],
    references: [users.id],
  }),
}))
