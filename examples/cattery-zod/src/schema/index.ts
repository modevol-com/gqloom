import { drizzleSilk } from "@gqloom/drizzle"
import { relations } from "drizzle-orm"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const users = drizzleSilk(
  sqliteTable("users", {
    id: integer().primaryKey({ autoIncrement: true }),
    name: text().notNull(),
    phone: text().notNull().unique(),
  })
)

export const usersRelations = relations(users, ({ many }) => ({
  cats: many(cats),
}))

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

export const catsRelations = relations(cats, ({ one }) => ({
  owner: one(users, {
    fields: [cats.ownerId],
    references: [users.id],
  }),
}))
