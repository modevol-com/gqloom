---
title: Drizzle
---

# Drizzle

[Drizzle](https://orm.drizzle.team/) 是一个现代化的、类型安全的 TypeScript ORM，专为 Node.js 设计。它提供了简洁易用的 API，支持 PostgreSQL、MySQL 和 SQLite 等数据库，具备强大的查询构建器、事务处理和数据库迁移功能，同时保持轻量级和无外部依赖的特点，非常适合需要高性能和类型安全的数据库操作场景。

`@gqloom/drizzle` 提供了 GQLoom 与 Drizzle 的集成：

- 使用 Drizzle Table 作为[丝线](../silk)使用；
- 使用解析器工厂从 Drizzle 快速生成 CRUD 操作。

## 安装

请参考 Drizzle 的[入门指南](https://orm.drizzle.team/docs/get-started)安装 Drizzle 与对应的数据库集成。

在完成 Drizzle 安装后，安装 `@gqloom/drizzle`：

::: code-group
```sh [npm]
npm i @gqloom/core @gqloom/drizzle
```
```sh [pnpm]
pnpm add @gqloom/core @gqloom/drizzle
```
```sh [yarn]
yarn add @gqloom/core @gqloom/drizzle
```
```sh [bun]
bun add @gqloom/core @gqloom/drizzle
```
:::

## 使用丝线

只需要使用 `drizzleSilk` 包裹 Drizzle Table，我们就可以轻松地将它们作为[丝线](../silk)使用。

```ts twoslash title="schema.ts"
import { drizzleSilk } from "@gqloom/drizzle"
import { relations } from "drizzle-orm"
import * as t from "drizzle-orm/sqlite-core"

export const users = drizzleSilk(
  t.sqliteTable("users", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    age: t.int(),
    email: t.text(),
    password: t.text(),
  })
)

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}))

export const posts = drizzleSilk(
  t.sqliteTable("posts", {
    id: t.int().primaryKey({ autoIncrement: true }),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.int().references(() => users.id, { onDelete: "cascade" }),
  })
)

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}))
```

让我们在解析器中使用它们：

```ts twoslash title="resolver.ts"
// @filename: schema.ts
import { drizzleSilk } from "@gqloom/drizzle"
import { relations } from "drizzle-orm"
import * as t from "drizzle-orm/sqlite-core"

export const users = drizzleSilk(
  t.sqliteTable("users", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    age: t.int(),
    email: t.text(),
    password: t.text(),
  })
)

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}))

export const posts = drizzleSilk(
  t.sqliteTable("posts", {
    id: t.int().primaryKey({ autoIncrement: true }),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.int().references(() => users.id, { onDelete: "cascade" }),
  })
)

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}))
// @filename: resolver.ts
// ---cut---
import {
  EasyDataLoader,
  createMemoization,
  field,
  query,
  resolver,
} from "@gqloom/core"
import { eq, inArray } from "drizzle-orm"
import { drizzle } from "drizzle-orm/libsql"
import * as v from "valibot"
import * as schema from "./schema"
import { posts, users } from "./schema"

const db = drizzle({
  schema,
  connection: { url: process.env.DB_FILE_NAME! },
})

const usePostsLoader = createMemoization(
  () =>
    new EasyDataLoader<
      typeof users.$inferSelect,
      (typeof posts.$inferSelect)[]
    >(async (userList) => {
      const postList = await db
        .select()
        .from(posts)
        .where(
          inArray(
            users.id,
            userList.map((user) => user.id)
          )
        )
      const groups = new Map<number, (typeof posts.$inferSelect)[]>()

      for (const post of postList) {
        const key = post.authorId
        if (key == null) continue
        groups.set(key, [...(groups.get(key) ?? []), post])
      }
      return userList.map((user) => groups.get(user.id) ?? [])
    })
)

export const usersResolver = resolver.of(users, {
  user: query
    .output(users.$nullable())
    .input({ id: v.number() })
    .resolve(({ id }) => {
      return db.select().from(users).where(eq(users.id, id)).get()
    }),

  users: query.output(users.$list()).resolve(() => {
    return db.select().from(users).all()
  }),

  posts: field.output(posts.$list()).resolve((user) => {
    return usePostsLoader().load(user)
  }),
})
```

如上面的代码所示，我们可以直接在 `resolver` 里使用 `drizzleSilk` 包裹的 Drizzle Table。  
在这里我们使用了 `users` 作为 `resolver.of` 的父类型，并在 resolver 中定义了 `user`、`users` 两个查询和一个名为 `posts` 的字段。其中 `user` 的返回类型是 `users.$nullable()`，表示 `user` 可能为空；`users` 的返回类型是 `users.$list()`，表示 `users` 将返回一个 `users` 的列表；`posts` 字段的返回类型是 `posts.$list()`，在 `posts` 字段中，我们使用了 `user` 参数，TypeScript 将帮助我们推断其类型，我们将 `user` 传递给 `usePostsLoader().load()` 来批量获取 `posts`。

### 隐藏字段

有时候我们并不想把数据库表格的所有字段都暴露给客户端。  
考虑我们有一张包含密码字段的 `users` 表，其中 `password` 字段是加密后的密码，我们不希望把它暴露给客户端：

```ts twoslash title="schema.ts"
import { drizzleSilk } from "@gqloom/drizzle"
import * as t from "drizzle-orm/sqlite-core"

export const users = drizzleSilk(
  t.sqliteTable("users", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    age: t.int(),
    email: t.text(),
    password: t.text(),
  })
)
```

我们可以在解析器中使用 `field.hidden` 来隐藏 `password` 字段：

```ts twoslash title="resolver.ts"
// @filename: schema.ts
import { drizzleSilk } from "@gqloom/drizzle"
import * as t from "drizzle-orm/sqlite-core"

export const users = drizzleSilk(
  t.sqliteTable("users", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    age: t.int(),
    email: t.text(),
    password: t.text(),
  })
)
// @filename: resolver.ts
// ---cut---
import { field, resolver } from "@gqloom/core"
import { users } from "./schema"

export const usersResolver = resolver.of(users, {
  password: field.hidden,
})
```

## 解析器工厂

`gqloom/drizzle` 提供了解析器工厂 `DrizzleResolverFactory`，用于从 Drizzle 轻松地生成 CRUD 解析器，同时支持自定参数和添加中间件。

```ts twoslash title="resolver.ts"
// @filename: schema.ts
import { drizzleSilk } from "@gqloom/drizzle"
import { relations } from "drizzle-orm"
import * as t from "drizzle-orm/sqlite-core"

export const users = drizzleSilk(
  t.sqliteTable("users", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    age: t.int(),
    email: t.text(),
    password: t.text(),
  })
)

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}))

export const posts = drizzleSilk(
  t.sqliteTable("posts", {
    id: t.int().primaryKey({ autoIncrement: true }),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.int().references(() => users.id, { onDelete: "cascade" }),
  })
)

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}))
// @filename: resolver.ts
// ---cut---
import { drizzleResolverFactory } from "@gqloom/drizzle"
import { drizzle } from "drizzle-orm/libsql"
import * as schema from "./schema"

const db = drizzle({
  schema,
  connection: { url: process.env.DB_FILE_NAME! },
})

const usersResolverFactory = drizzleResolverFactory(db, "users")
```

### 关系字段

在 Drizzle Table 中，我们可以轻松地创建[关系](https://orm.drizzle.team/docs/relations)，使用解析器工厂的 `relationField` 方法可以为关系创建对应的 GraphQL 字段。

```ts twoslash title="resolver.ts"
// @filename: schema.ts
import { drizzleSilk } from "@gqloom/drizzle"
import { relations } from "drizzle-orm"
import * as t from "drizzle-orm/sqlite-core"

export const users = drizzleSilk(
  t.sqliteTable("users", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    age: t.int(),
    email: t.text(),
    password: t.text(),
  })
)

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}))

export const posts = drizzleSilk(
  t.sqliteTable("posts", {
    id: t.int().primaryKey({ autoIncrement: true }),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.int().references(() => users.id, { onDelete: "cascade" }),
  })
)

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}))
// @filename: resolver.ts
import { field, EasyDataLoader, createMemoization } from "@gqloom/core"
import { posts } from "schema"
// ---cut---
import { query, resolver } from "@gqloom/core"
import { drizzleResolverFactory } from "@gqloom/drizzle"
import { eq, inArray } from "drizzle-orm"
import { drizzle } from "drizzle-orm/libsql"
import * as v from "valibot"
import * as schema from "./schema"
import { users } from "./schema"

const db = drizzle({
  schema,
  connection: { url: process.env.DB_FILE_NAME! },
})

const usersResolverFactory = drizzleResolverFactory(db, "users")

const usePostsLoader = createMemoization( // [!code --]
  () => // [!code --]
    new EasyDataLoader< // [!code --]
      typeof users.$inferSelect, // [!code --]
      (typeof posts.$inferSelect)[] // [!code --]
    >(async (userList) => { // [!code --]
      const postList = await db // [!code --]
        .select() // [!code --]
        .from(posts) // [!code --]
        .where( // [!code --]
          inArray( // [!code --]
            users.id, // [!code --]
            userList.map((user) => user.id) // [!code --]
          ) // [!code --]
        ) // [!code --]
      const groups = new Map<number, (typeof posts.$inferSelect)[]>() // [!code --]
      // [!code --]
      for (const post of postList) { // [!code --]
        const key = post.authorId // [!code --]
        if (key == null) continue // [!code --]
        groups.set(key, [...(groups.get(key) ?? []), post]) // [!code --]
      } // [!code --]
      return userList.map((user) => groups.get(user.id) ?? []) // [!code --]
    }) // [!code --]
) // [!code --]
 
export const usersResolver = resolver.of(users, {
  user: query
    .output(users.$nullable())
    .input({ id: v.number() })
    .resolve(({ id }) => {
      return db.select().from(users).where(eq(users.id, id)).get()
    }),

  users: query.output(users.$list()).resolve(() => {
    return db.select().from(users).all()
  }),

  posts_: field.output(posts.$list()).resolve((user) => { // [!code --]
    return usePostsLoader().load(user) // [!code --]
  }), // [!code --]

  posts: usersResolverFactory.relationField("posts"), // [!code ++]
})
```

### 查询

Drizzle 解析器工厂预置了一些常用的查询：

- `selectArrayQuery`: 根据条件查找对应表的多条记录
- `selectSingleQuery`: 根据条件查找对应表的一条记录

我们可以在解析器内使用来自解析器工厂的查询：

```ts twoslash
// @filename: schema.ts
import { drizzleSilk } from "@gqloom/drizzle"
import { relations } from "drizzle-orm"
import * as t from "drizzle-orm/sqlite-core"

export const users = drizzleSilk(
  t.sqliteTable("users", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    age: t.int(),
    email: t.text(),
    password: t.text(),
  })
)

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}))

export const posts = drizzleSilk(
  t.sqliteTable("posts", {
    id: t.int().primaryKey({ autoIncrement: true }),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.int().references(() => users.id, { onDelete: "cascade" }),
  })
)

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}))
// @filename: resolver.ts
import { query, resolver } from "@gqloom/core"
import { drizzleResolverFactory } from "@gqloom/drizzle"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/libsql"
import * as v from "valibot"
import * as schema from "./schema"
import { users } from "./schema"

const db = drizzle({
  schema,
  connection: { url: process.env.DB_FILE_NAME! },
})

const usersResolverFactory = drizzleResolverFactory(db, "users")
// ---cut---
export const usersResolver = resolver.of(users, {
  user_: query // [!code --]
    .output(users.$nullable()) // [!code --]
    .input({ id: v.number() }) // [!code --]
    .resolve(({ id }) => { // [!code --]
      return db.select().from(users).where(eq(users.id, id)).get() // [!code --]
    }), // [!code --]

  user: usersResolverFactory.selectSingleQuery(), // [!code ++]

  users_: query.output(users.$list()).resolve(() => { // [!code --]
    return db.select().from(users).all() // [!code --]
  }), // [!code --]

  users: usersResolverFactory.selectArrayQuery(), // [!code ++]

  posts: usersResolverFactory.relationField("posts"), 
})
```

### 变更

Drizzle 解析器工厂预置了一些常用的变更：

- `insertArrayMutation`: 插入多条记录
- `insertSingleMutation`: 插入一条记录
- `updateMutation`: 更新记录
- `deleteMutation`: 删除记录

我们可以在解析器内使用来自解析器工厂的变更：

```ts twoslash
// @filename: schema.ts
import { drizzleSilk } from "@gqloom/drizzle"
import { relations } from "drizzle-orm"
import * as t from "drizzle-orm/sqlite-core"

export const users = drizzleSilk(
  t.sqliteTable("users", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    age: t.int(),
    email: t.text(),
    password: t.text(),
  })
)

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}))

export const posts = drizzleSilk(
  t.sqliteTable("posts", {
    id: t.int().primaryKey({ autoIncrement: true }),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.int().references(() => users.id, { onDelete: "cascade" }),
  })
)

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}))
// @filename: resolver.ts
import { resolver } from "@gqloom/core"
import { drizzleResolverFactory } from "@gqloom/drizzle"
import { drizzle } from "drizzle-orm/libsql"
import * as v from "valibot"
import * as schema from "./schema"
import { users } from "./schema"

const db = drizzle({
  schema,
  connection: { url: process.env.DB_FILE_NAME! },
})

const usersResolverFactory = drizzleResolverFactory(db, "users")
// ---cut---
export const usersResolver = resolver.of(users, {
  user: usersResolverFactory.selectSingleQuery(),

  users: usersResolverFactory.selectArrayQuery(),

  createUser: usersResolverFactory.insertSingleMutation(), // [!code ++]

  createUsers: usersResolverFactory.insertArrayMutation(), // [!code ++]

  posts: usersResolverFactory.relationField("posts"),
})
```

### 自定义输入

解析器工厂预置的查询和变更支持自定义输入，你可以通过 `input` 选项来定义输入类型：

```ts twoslash
// @filename: schema.ts
import { drizzleSilk } from "@gqloom/drizzle"
import { relations } from "drizzle-orm"
import * as t from "drizzle-orm/sqlite-core"

export const users = drizzleSilk(
  t.sqliteTable("users", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    age: t.int(),
    email: t.text(),
    password: t.text(),
  })
)

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}))

export const posts = drizzleSilk(
  t.sqliteTable("posts", {
    id: t.int().primaryKey({ autoIncrement: true }),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.int().references(() => users.id, { onDelete: "cascade" }),
  })
)

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}))
// @filename: resolver.ts
import { query, resolver } from "@gqloom/core"
import { drizzleResolverFactory } from "@gqloom/drizzle"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/libsql"
import * as v from "valibot"
import * as schema from "./schema"
import { users } from "./schema"

const db = drizzle({
  schema,
  connection: { url: process.env.DB_FILE_NAME! },
})

const usersResolverFactory = drizzleResolverFactory(db, "users")
// ---cut---
export const usersResolver = resolver.of(users, {
  user: usersResolverFactory.selectSingleQuery({
    input: v.pipe( // [!code hl]
      v.object({ id: v.number() }), // [!code hl]
      v.transform(({ id }) => ({ where: eq(users.id, id) })) // [!code hl]
    ), // [!code hl]
  }), 

  users: usersResolverFactory.selectArrayQuery(),

  posts: usersResolverFactory.relationField("posts"),
})
```

在上面的代码中，我们使用 `valibot` 来定义输入类型， `v.object({ id: v.number() })` 定义了输入对象的类型，`v.transform(({ id }) => ({ where: eq(users.id, id) }))` 将输入参数转换为 Prisma 的查询参数。

### 添加中间件

解析器工厂预置的查询、变更和字段支持添加中间件，你可以通过 `middlewares` 选项来定义中间件：

```ts twoslash
// @filename: schema.ts
import { drizzleSilk } from "@gqloom/drizzle"
import { relations } from "drizzle-orm"
import * as t from "drizzle-orm/sqlite-core"

export const users = drizzleSilk(
  t.sqliteTable("users", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    age: t.int(),
    email: t.text(),
    password: t.text(),
  })
)

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}))

export const posts = drizzleSilk(
  t.sqliteTable("posts", {
    id: t.int().primaryKey({ autoIncrement: true }),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.int().references(() => users.id, { onDelete: "cascade" }),
  })
)

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}))
// @filename: resolver.ts
import { query, field, resolver, createMemoization } from "@gqloom/core"
import { drizzleResolverFactory } from "@gqloom/drizzle"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/libsql"
import { GraphQLError } from "graphql"
import * as v from "valibot"
import * as schema from "./schema"
import { users, posts } from "./schema"

const db = drizzle({
  schema,
  connection: { url: process.env.DB_FILE_NAME! },
})

const postsResolverFactory = drizzleResolverFactory(db, "posts")

const useAuthedUser = createMemoization( async ()=> ({
  id: 0,
  name: "",
}))

// ---cut---
const postResolver = resolver.of(posts, {
  createPost: postsResolverFactory.insertSingleMutation({
    middlewares: [
      async (next) => {
        const user = await useAuthedUser()
        if (user == null) throw new GraphQLError("Please login first")
        return next()
      },
    ],
  }),

  author: postsResolverFactory.relationField("author"),

  authorId: field.hidden,
})
```

在上面的代码中，我们使用 `middlewares` 选项来定义中间件，`async (next) => { ... }` 定义了一个中间件，`useAuthedUser()` 是一个自定义的函数，用于获取当前登录的用户，如果用户未登录，则抛出一个错误，否则调用 `next()` 继续执行。

### 完整解析器

我们可以用解析器工厂直接创建一个完整的 Resolver：

```ts twoslash
// @filename: schema.ts
import { drizzleSilk } from "@gqloom/drizzle"
import { relations } from "drizzle-orm"
import * as t from "drizzle-orm/sqlite-core"

export const users = drizzleSilk(
  t.sqliteTable("users", {
    id: t.int().primaryKey({ autoIncrement: true }),
    name: t.text().notNull(),
    age: t.int(),
    email: t.text(),
    password: t.text(),
  })
)

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}))

export const posts = drizzleSilk(
  t.sqliteTable("posts", {
    id: t.int().primaryKey({ autoIncrement: true }),
    title: t.text().notNull(),
    content: t.text(),
    authorId: t.int().references(() => users.id, { onDelete: "cascade" }),
  })
)

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}))
// @filename: resolver.ts
import { query, resolver } from "@gqloom/core"
import { drizzleResolverFactory } from "@gqloom/drizzle"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/libsql"
import * as v from "valibot"
import * as schema from "./schema"
import { users } from "./schema"

const db = drizzle({
  schema,
  connection: { url: process.env.DB_FILE_NAME! },
})

const usersResolverFactory = drizzleResolverFactory(db, "users")
// ---cut---
const usersResolver = usersResolverFactory.resolver()
```

在上面的代码中，我们使用 `usersResolverFactory.resolver()` 来创建一个 Resolver。这个Resolver 将包含工厂中所有的查询、变更和字段。

## 自定义类型映射

为了适应更多的 Drizzle 类型，我们可以拓展 GQLoom 为其添加更多的类型映射。

首先我们使用 `DrizzleWeaver.config` 来定义类型映射的配置。这里我们导入来自 [graphql-scalars](https://the-guild.dev/graphql/scalars) 的 `GraphQLDateTime` 和  `GraphQLJSONObject` ，当遇到 `date` 和 `json` 类型时，我们将其映射到对应的 GraphQL 标量。

```ts twoslash
import { GraphQLDateTime, GraphQLJSONObject } from "graphql-scalars"
import { DrizzleWeaver } from "@gqloom/drizzle"

const drizzleWeaverConfig = DrizzleWeaver.config({
  presetGraphQLType: (column) => {
    if (column.dataType === "date") {
      return GraphQLDateTime
    }
    if (column.dataType === "json") {
      return GraphQLJSONObject
    }
  },
})
```

在编织 GraphQL Schema 时传入配置到 weave 函数中：

```ts
import { weave } from "@gqloom/core"

export const schema = weave(drizzleWeaverConfig, usersResolver, postsResolver)
```

## 默认类型映射

下表列出了 GQLoom 中 Drizzle `dataType` 与 GraphQL 类型之间的默认映射关系：

| Drizzle `dataType` | GraphQL 类型     |
| ------------------ | ---------------- |
| boolean            | `GraphQLBoolean` |
| number             | `GraphQLFloat`   |
| json               | `GraphQLString`  |
| date               | `GraphQLString`  |
| bigint             | `GraphQLString`  |
| string             | `GraphQLString`  |
| buffer             | `GraphQLList`    |
| array              | `GraphQLList`    |