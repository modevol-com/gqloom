import { drizzleSilk } from "@gqloom/drizzle"
import { relations } from "drizzle-orm"
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core"

export const roleEnum = pgEnum("role", ["user", "admin"])

export const User = drizzleSilk(
  pgTable("users", {
    id: serial().primaryKey(),
    createdAt: timestamp().defaultNow(),
    email: text().unique().notNull(),
    name: text(),
    role: roleEnum().default("user"),
  })
)

export const usersRelations = relations(User, ({ many }) => ({
  posts: many(Post),
}))

export const Post = drizzleSilk(
  pgTable("posts", {
    id: serial().primaryKey(),
    createdAt: timestamp().defaultNow(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
    published: boolean().default(false),
    title: varchar({ length: 255 }).notNull(),
    authorId: integer(),
  })
)

export const postsRelations = relations(Post, ({ one }) => ({
  author: one(User, { fields: [Post.authorId], references: [User.id] }),
}))
