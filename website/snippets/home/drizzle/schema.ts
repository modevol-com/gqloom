import { drizzleSilk } from "@gqloom/drizzle"
import { defineRelations } from "drizzle-orm"
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

export const relations = defineRelations({ users: User, posts: Post }, (r) => ({
  users: {
    posts: r.many.posts({
      from: r.users.id,
      to: r.posts.authorId,
    }),
  },
  posts: {
    author: r.one.users({
      from: r.posts.authorId,
      to: r.users.id,
    }),
  },
}))
