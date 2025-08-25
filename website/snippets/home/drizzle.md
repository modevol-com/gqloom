::: code-group
```ts twoslash [index.ts]
// @filename: schema.ts
import { drizzleSilk } from "@gqloom/drizzle"
import { relations } from "drizzle-orm"
import * as t from "drizzle-orm/pg-core"

export const roleEnum = t.pgEnum("role", ["user", "admin"])

export const users = drizzleSilk(
  t.pgTable("users", {
    id: t.serial().primaryKey(),
    createdAt: t.timestamp().defaultNow(),
    email: t.text().unique().notNull(),
    name: t.text(),
    role: roleEnum().default("user"),
  })
)

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}))

export const posts = drizzleSilk(
  t.pgTable("posts", {
    id: t.serial().primaryKey(),
    createdAt: t.timestamp().defaultNow(),
    updatedAt: t
      .timestamp()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
    published: t.boolean().default(false),
    title: t.varchar({ length: 255 }).notNull(),
    authorId: t.integer(),
  })
)

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
}))
// @filename: index.ts
// ---cut---
import { createServer } from "node:http"
import { weave } from "@gqloom/core"
import { drizzleResolverFactory } from "@gqloom/drizzle"
import { drizzle } from "drizzle-orm/node-postgres"
import { createYoga } from "graphql-yoga"
import * as tables from "./schema"

const db = drizzle(process.env.DATABASE_URL!, { schema: tables })

const userResolver = drizzleResolverFactory(db, "users").resolver()
const postResolver = drizzleResolverFactory(db, "posts").resolver()

const schema = weave(userResolver, postResolver)

const yoga = createYoga({ schema })
const server = createServer(yoga)
server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
```

```ts twoslash [schema.ts]
import { drizzleSilk } from "@gqloom/drizzle"
import { relations } from "drizzle-orm"
import * as t from "drizzle-orm/pg-core"

export const roleEnum = t.pgEnum("role", ["user", "admin"])

export const users = drizzleSilk(
  t.pgTable("users", {
    id: t.serial().primaryKey(),
    createdAt: t.timestamp().defaultNow(),
    email: t.text().unique().notNull(),
    name: t.text(),
    role: roleEnum().default("user"),
  })
)

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}))

export const posts = drizzleSilk(
  t.pgTable("posts", {
    id: t.serial().primaryKey(),
    createdAt: t.timestamp().defaultNow(),
    updatedAt: t
      .timestamp()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
    published: t.boolean().default(false),
    title: t.varchar({ length: 255 }).notNull(),
    authorId: t.integer(),
  })
)

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
}))
```

```GraphQL [schema.graphql]
type UsersItem {
  id: Int!
  createdAt: String
  email: String!
  name: String
  role: String
  posts: [PostsItem!]!
}

type PostsItem {
  id: Int!
  createdAt: String
  updatedAt: String
  published: Boolean
  title: String!
  authorId: Int
  author: UsersItem
}

type Query {
  users(offset: Int, limit: Int, orderBy: [UsersOrderBy!], where: UsersFilters): [UsersItem!]!
  usersSingle(offset: Int, orderBy: [UsersOrderBy!], where: UsersFilters): UsersItem
  posts(offset: Int, limit: Int, orderBy: [PostsOrderBy!], where: PostsFilters): [PostsItem!]!
  postsSingle(offset: Int, orderBy: [PostsOrderBy!], where: PostsFilters): PostsItem
}

input UsersOrderBy {
  id: OrderDirection
  createdAt: OrderDirection
  email: OrderDirection
  name: OrderDirection
  role: OrderDirection
}

enum OrderDirection {
  asc
  desc
}

input UsersFilters {
  id: PgSerialFilters
  createdAt: PgTimestampFilters
  email: PgTextFilters
  name: PgTextFilters
  role: PgEnumColumnFilters
  OR: [UsersFiltersOr!]
}

input PgSerialFilters {
  eq: Int
  ne: Int
  lt: Int
  lte: Int
  gt: Int
  gte: Int
  inArray: [Int!]
  notInArray: [Int!]
  isNull: Boolean
  isNotNull: Boolean
  OR: [PgSerialFiltersOr!]
}

input PgSerialFiltersOr {
  eq: Int
  ne: Int
  lt: Int
  lte: Int
  gt: Int
  gte: Int
  inArray: [Int!]
  notInArray: [Int!]
  isNull: Boolean
  isNotNull: Boolean
}

input PgTimestampFilters {
  eq: String
  ne: String
  lt: String
  lte: String
  gt: String
  gte: String
  like: String
  notLike: String
  ilike: String
  notIlike: String
  inArray: [String!]
  notInArray: [String!]
  isNull: Boolean
  isNotNull: Boolean
  OR: [PgTimestampFiltersOr!]
}

input PgTimestampFiltersOr {
  eq: String
  ne: String
  lt: String
  lte: String
  gt: String
  gte: String
  like: String
  notLike: String
  ilike: String
  notIlike: String
  inArray: [String!]
  notInArray: [String!]
  isNull: Boolean
  isNotNull: Boolean
}

input PgTextFilters {
  eq: String
  ne: String
  lt: String
  lte: String
  gt: String
  gte: String
  like: String
  notLike: String
  ilike: String
  notIlike: String
  inArray: [String!]
  notInArray: [String!]
  isNull: Boolean
  isNotNull: Boolean
  OR: [PgTextFiltersOr!]
}

input PgTextFiltersOr {
  eq: String
  ne: String
  lt: String
  lte: String
  gt: String
  gte: String
  like: String
  notLike: String
  ilike: String
  notIlike: String
  inArray: [String!]
  notInArray: [String!]
  isNull: Boolean
  isNotNull: Boolean
}

input PgEnumColumnFilters {
  eq: String
  ne: String
  lt: String
  lte: String
  gt: String
  gte: String
  like: String
  notLike: String
  ilike: String
  notIlike: String
  inArray: [String!]
  notInArray: [String!]
  isNull: Boolean
  isNotNull: Boolean
  OR: [PgEnumColumnFiltersOr!]
}

input PgEnumColumnFiltersOr {
  eq: String
  ne: String
  lt: String
  lte: String
  gt: String
  gte: String
  like: String
  notLike: String
  ilike: String
  notIlike: String
  inArray: [String!]
  notInArray: [String!]
  isNull: Boolean
  isNotNull: Boolean
}

input UsersFiltersOr {
  id: PgSerialFilters
  createdAt: PgTimestampFilters
  email: PgTextFilters
  name: PgTextFilters
  role: PgEnumColumnFilters
}

input PostsOrderBy {
  id: OrderDirection
  createdAt: OrderDirection
  updatedAt: OrderDirection
  published: OrderDirection
  title: OrderDirection
  authorId: OrderDirection
}

input PostsFilters {
  id: PgSerialFilters
  createdAt: PgTimestampFilters
  updatedAt: PgTimestampFilters
  published: PgBooleanFilters
  title: PgVarcharFilters
  authorId: PgIntegerFilters
  OR: [PostsFiltersOr!]
}

input PgBooleanFilters {
  eq: Boolean
  ne: Boolean
  lt: Boolean
  lte: Boolean
  gt: Boolean
  gte: Boolean
  inArray: [Boolean!]
  notInArray: [Boolean!]
  isNull: Boolean
  isNotNull: Boolean
  OR: [PgBooleanFiltersOr!]
}

input PgBooleanFiltersOr {
  eq: Boolean
  ne: Boolean
  lt: Boolean
  lte: Boolean
  gt: Boolean
  gte: Boolean
  inArray: [Boolean!]
  notInArray: [Boolean!]
  isNull: Boolean
  isNotNull: Boolean
}

input PgVarcharFilters {
  eq: String
  ne: String
  lt: String
  lte: String
  gt: String
  gte: String
  like: String
  notLike: String
  ilike: String
  notIlike: String
  inArray: [String!]
  notInArray: [String!]
  isNull: Boolean
  isNotNull: Boolean
  OR: [PgVarcharFiltersOr!]
}

input PgVarcharFiltersOr {
  eq: String
  ne: String
  lt: String
  lte: String
  gt: String
  gte: String
  like: String
  notLike: String
  ilike: String
  notIlike: String
  inArray: [String!]
  notInArray: [String!]
  isNull: Boolean
  isNotNull: Boolean
}

input PgIntegerFilters {
  eq: Int
  ne: Int
  lt: Int
  lte: Int
  gt: Int
  gte: Int
  inArray: [Int!]
  notInArray: [Int!]
  isNull: Boolean
  isNotNull: Boolean
  OR: [PgIntegerFiltersOr!]
}

input PgIntegerFiltersOr {
  eq: Int
  ne: Int
  lt: Int
  lte: Int
  gt: Int
  gte: Int
  inArray: [Int!]
  notInArray: [Int!]
  isNull: Boolean
  isNotNull: Boolean
}

input PostsFiltersOr {
  id: PgSerialFilters
  createdAt: PgTimestampFilters
  updatedAt: PgTimestampFilters
  published: PgBooleanFilters
  title: PgVarcharFilters
  authorId: PgIntegerFilters
}

type Mutation {
  insertIntoUsers(values: [UsersInsertInput!]!): [UsersItem!]!
  insertIntoUsersSingle(value: UsersInsertInput!): UsersItem
  updateUsers(where: UsersFilters, set: UsersUpdateInput!): [UsersItem!]!
  deleteFromUsers(where: UsersFilters): [UsersItem!]!
  insertIntoPosts(values: [PostsInsertInput!]!): [PostsItem!]!
  insertIntoPostsSingle(value: PostsInsertInput!): PostsItem
  updatePosts(where: PostsFilters, set: PostsUpdateInput!): [PostsItem!]!
  deleteFromPosts(where: PostsFilters): [PostsItem!]!
}

input UsersInsertInput {
  id: Int
  createdAt: String
  email: String!
  name: String
  role: String
}

input UsersUpdateInput {
  id: Int
  createdAt: String
  email: String
  name: String
  role: String
}

input PostsInsertInput {
  id: Int
  createdAt: String
  updatedAt: String
  published: Boolean
  title: String!
  authorId: Int
}

input PostsUpdateInput {
  id: Int
  createdAt: String
  updatedAt: String
  published: Boolean
  title: String
  authorId: Int
}
```
:::