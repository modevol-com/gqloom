```ts twoslash title="src/index.ts" tab="index.ts"
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

```ts twoslash title="src/schema.ts" tab="schema.ts"
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

```graphql title="schema.graphql" tab="schema.graphql"
type UsersItem {
  id: Int!
  createdAt: String
  email: String!
  name: String
  role: Role
  posts: [PostsItem!]!
}

enum Role {
  USER
  ADMIN
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
  usersCount(where: UsersFilters): Int!
  posts(offset: Int, limit: Int, orderBy: [PostsOrderBy!], where: PostsFilters): [PostsItem!]!
  postsSingle(offset: Int, orderBy: [PostsOrderBy!], where: PostsFilters): PostsItem
  postsCount(where: PostsFilters): Int!
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
  eq: Role
  ne: Role
  lt: Role
  lte: Role
  gt: Role
  gte: Role
  inArray: [Role!]
  notInArray: [Role!]
  isNull: Boolean
  isNotNull: Boolean
  OR: [PgEnumColumnFiltersOr!]
}

input PgEnumColumnFiltersOr {
  eq: Role
  ne: Role
  lt: Role
  lte: Role
  gt: Role
  gte: Role
  inArray: [Role!]
  notInArray: [Role!]
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
  insertIntoUsers(values: [UsersInsertInput!]!, onConflictDoUpdate: UsersInsertOnConflictDoUpdateInput, onConflictDoNothing: UsersInsertOnConflictDoNothingInput): [UsersItem!]!
  insertIntoUsersSingle(value: UsersInsertInput!, onConflictDoUpdate: UsersInsertOnConflictDoUpdateInput, onConflictDoNothing: UsersInsertOnConflictDoNothingInput): UsersItem
  updateUsers(where: UsersFilters, set: UsersUpdateInput!): [UsersItem!]!
  deleteFromUsers(where: UsersFilters): [UsersItem!]!
  insertIntoPosts(values: [PostsInsertInput!]!, onConflictDoUpdate: PostsInsertOnConflictDoUpdateInput, onConflictDoNothing: PostsInsertOnConflictDoNothingInput): [PostsItem!]!
  insertIntoPostsSingle(value: PostsInsertInput!, onConflictDoUpdate: PostsInsertOnConflictDoUpdateInput, onConflictDoNothing: PostsInsertOnConflictDoNothingInput): PostsItem
  updatePosts(where: PostsFilters, set: PostsUpdateInput!): [PostsItem!]!
  deleteFromPosts(where: PostsFilters): [PostsItem!]!
}

input UsersInsertInput {
  id: Int
  createdAt: String
  email: String!
  name: String
  role: Role
}

input UsersInsertOnConflictDoUpdateInput {
  target: [UsersTableColumn!]!
  set: UsersUpdateInput
  targetWhere: UsersFilters
  setWhere: UsersFilters
}

enum UsersTableColumn {
  id
  createdAt
  email
  name
  role
}

input UsersUpdateInput {
  id: Int
  createdAt: String
  email: String
  name: String
  role: Role
}

input UsersInsertOnConflictDoNothingInput {
  target: [UsersTableColumn!]
  where: UsersFilters
}

input PostsInsertInput {
  id: Int
  createdAt: String
  updatedAt: String
  published: Boolean
  title: String!
  authorId: Int
}

input PostsInsertOnConflictDoUpdateInput {
  target: [PostsTableColumn!]!
  set: PostsUpdateInput
  targetWhere: PostsFilters
  setWhere: PostsFilters
}

enum PostsTableColumn {
  id
  createdAt
  updatedAt
  published
  title
  authorId
}

input PostsUpdateInput {
  id: Int
  createdAt: String
  updatedAt: String
  published: Boolean
  title: String
  authorId: Int
}

input PostsInsertOnConflictDoNothingInput {
  target: [PostsTableColumn!]
  where: PostsFilters
}
```