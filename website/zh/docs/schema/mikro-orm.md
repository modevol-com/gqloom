<script setup>
import { Tabs } from "@/components/tabs.tsx"
</script>

# MikroORM

[MikroORM](https://mikro-orm.io/) 是一个适用于 Node.js 的 TypeScript ORM，支持 PostgreSQL、MySQL、MariaDB、SQLite 和 MongoDB 等多种数据库。它基于 Data Mapper、Unit of Work 和 Identity Map 模式，旨在提供一个功能强大且易于使用的数据库工具集。

`@gqloom/mikro-orm` 提供了 GQLoom 与 MikroORM 的集成：

- 使用 MikroORM Entity 作为[丝线](../silk)使用；
- 使用解析器工厂从 MikroORM 快速生成 CRUD 操作。

## 安装

<!--@include: ../../snippets/install-mikro.md-->

## 使用丝线

只需要使用 `mikroSilk` 包裹 MikroORM Entity，我们就可以轻松地将它们作为[丝线](../silk)使用。

::: code-group

```ts twoslash [使用丝线]
import { mikroSilk } from "@gqloom/mikro-orm"
import { type InferEntity, defineEntity } from "@mikro-orm/core"

const UserEntity = defineEntity({
  name: "User",
  properties: (p) => ({
    id: p.integer().primary().autoincrement(),
    createdAt: p.datetime().onCreate(() => new Date()),
    email: p.string(),
    name: p.string(),
    role: p.string().$type<"admin" | "user">().default("user"),
    posts: () => p.oneToMany(PostEntity).mappedBy("author"),
  }),
})
export interface IUser extends InferEntity<typeof UserEntity> {}

const PostEntity = defineEntity({
  name: "Post",
  properties: (p) => ({
    id: p.integer().primary().autoincrement(),
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
    published: p.boolean().default(false),
    title: p.string(),
    author: () => p.manyToOne(UserEntity),
  }),
})
export interface IPost extends InferEntity<typeof PostEntity> {}
// ---cut---
export const User = mikroSilk(UserEntity)
export const Post = mikroSilk(PostEntity)
```

```ts twoslash [完整文件]
import { mikroSilk } from "@gqloom/mikro-orm"
import { type InferEntity, defineEntity } from "@mikro-orm/core"

const UserEntity = defineEntity({
  name: "User",
  properties: (p) => ({
    id: p.integer().primary().autoincrement(),
    createdAt: p.datetime().onCreate(() => new Date()),
    email: p.string(),
    name: p.string(),
    role: p.string().$type<"admin" | "user">().default("user"),
    posts: () => p.oneToMany(PostEntity).mappedBy("author"),
  }),
})
export interface IUser extends InferEntity<typeof UserEntity> {}

const PostEntity = defineEntity({
  name: "Post",
  properties: (p) => ({
    id: p.integer().primary().autoincrement(),
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
    published: p.boolean().default(false),
    title: p.string(),
    author: () => p.manyToOne(UserEntity),
  }),
})
export interface IPost extends InferEntity<typeof PostEntity> {}

export const User = mikroSilk(UserEntity)
export const Post = mikroSilk(PostEntity)
```

:::

在解析器中使用它们之前，我们需要初始化 MikroORM 并提供一个请求作用域的 Entity Manager。

```ts twoslash title="provider.ts"
// @filename: entities.ts
import { mikroSilk } from "@gqloom/mikro-orm"
import { type InferEntity, defineEntity } from "@mikro-orm/core"
const UserEntity = defineEntity({
  name: "User",
  properties: (p) => ({
    id: p.integer().primary().autoincrement(),
    createdAt: p.datetime().onCreate(() => new Date()),
    email: p.string(),
    name: p.string(),
    role: p.string().$type<"admin" | "user">().default("user"),
    posts: () => p.oneToMany(PostEntity).mappedBy("author"),
  }),
})
export interface IUser extends InferEntity<typeof UserEntity> {}
const PostEntity = defineEntity({
  name: "Post",
  properties: (p) => ({
    id: p.integer().primary().autoincrement(),
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
    published: p.boolean().default(false),
    title: p.string(),
    author: () => p.manyToOne(UserEntity),
  }),
})
export interface IPost extends InferEntity<typeof PostEntity> {}
export const User = mikroSilk(UserEntity)
export const Post = mikroSilk(PostEntity)
// @filename: index.ts
// ---cut---
import type { Middleware } from "@gqloom/core"
import { createMemoization, useResolvingFields } from "@gqloom/core/context"
import { MikroORM } from "@mikro-orm/libsql"
import { Post, User } from "./entities"

export let orm: MikroORM

export const ormPromise = MikroORM.init({
  entities: [User, Post],
  dbName: ":memory:",
  debug: true,
}).then(async (o) => {
  orm = o
  await orm.getSchemaGenerator().updateSchema()
})

export const useEm = createMemoization(() => orm.em.fork())

export const useSelectedFields = () => {
  return Array.from(useResolvingFields()?.selectedFields ?? ["*"]) as []
}

export const flusher: Middleware = async ({ next }) => {
  const result = await next()
  await useEm().flush()
  return result
}
```

现在我们可以在解析器中使用它们了：

```ts twoslash title="resolver.ts"
// @filename: entities.ts
import { mikroSilk } from "@gqloom/mikro-orm"
import { type InferEntity, defineEntity } from "@mikro-orm/core"
const UserEntity = defineEntity({
  name: "User",
  properties: (p) => ({
    id: p.integer().primary().autoincrement(),
    createdAt: p.datetime().onCreate(() => new Date()),
    email: p.string(),
    name: p.string(),
    role: p.string().$type<"admin" | "user">().default("user"),
    posts: () => p.oneToMany(PostEntity).mappedBy("author"),
  }),
})
export interface IUser extends InferEntity<typeof UserEntity> {}
const PostEntity = defineEntity({
  name: "Post",
  properties: (p) => ({
    id: p.integer().primary().autoincrement(),
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
    published: p.boolean().default(false),
    title: p.string(),
    author: () => p.manyToOne(UserEntity),
  }),
})
export interface IPost extends InferEntity<typeof PostEntity> {}
export const User = mikroSilk(UserEntity)
export const Post = mikroSilk(PostEntity)
// @filename: provider.ts
import type { Middleware } from "@gqloom/core"
import { createMemoization, useResolvingFields } from "@gqloom/core/context"
import { MikroORM } from "@mikro-orm/libsql"
import { Post as PostEntity, User as UserEntity } from "./entities"
export let orm: MikroORM
export const ormPromise = MikroORM.init({
  entities: [UserEntity, PostEntity],
  dbName: ":memory:",
}).then(async (o: MikroORM) => {
  orm = o
  await orm.getSchemaGenerator().updateSchema()
})
export const useEm = createMemoization(() => orm.em.fork())
export const useSelectedFields = () => {
  return Array.from(useResolvingFields()?.selectedFields ?? ["*"]) as []
}
export const flusher: Middleware = async ({ next }) => {
  const result = await next()
  await useEm().flush()
  return result
}
// @filename: index.ts
// ---cut---
import { field, mutation, query, resolver } from "@gqloom/core"
import * as v from "valibot"
import { Post, User } from "./entities"
import { flusher, useEm, useSelectedFields } from "./provider"

export const userResolver = resolver.of(User, {
  user: query(User.nullable())
    .input({ id: v.number() })
    .resolve(async ({ id }) => {
      const user = await useEm().findOne(
        User,
        { id },
        { fields: useSelectedFields() }
      )
      return user
    }),

  users: query(User.list()).resolve(() => {
    return useEm().findAll(User, { fields: useSelectedFields() })
  }),

  createUser: mutation(User)
    .input({
      data: v.object({
        name: v.string(),
        email: v.string(),
      }),
    })
    .use(flusher)
    .resolve(async ({ data }) => {
      const user = useEm().create(User, data)
      useEm().persist(user)
      return user
    }),

  posts: field(Post.list())
    .derivedFrom("id")
    .resolve((user) => {
      return useEm().find(
        Post,
        { author: user.id },
        { fields: useSelectedFields() }
      )
    }),
})
```

如上面的代码所示，我们可以直接在 `resolver` 里使用 `mikroSilk` 包裹的 MikroORM 实体。在这里我们使用了 `User` 作为 `resolver.of` 的父类型，并定义了 `user` 和 `users` 两个查询，以及一个 `createUser` 变更。

所有数据库操作都通过 `useEm()` 获取的请求作用域 Entity Manager 来执行。  
对于变更操作，我们使用了一个 `flusher` 中间件，它会在变更操作成功后自动调用 `em.flush()` 来将更改持久化到数据库。  
我们还通过 `useSelectedFields()` 函数来确保只选择 GraphQL 查询中请求的字段，这有助于优化数据库查询性能。此函数需要[启用上下文](../context)。

### 派生字段

为数据库实体添加派生字段非常简单：

```ts twoslash
// @filename: entities.ts
import { mikroSilk } from "@gqloom/mikro-orm"
import { type InferEntity, defineEntity } from "@mikro-orm/core"

const UserEntity = defineEntity({
  name: "User",
  properties: (p) => ({
    id: p.integer().primary().autoincrement(),
    createdAt: p.datetime().onCreate(() => new Date()),
    email: p.string(),
    name: p.string(),
    role: p.string().$type<"admin" | "user">().default("user"),
    posts: () => p.oneToMany(PostEntity).mappedBy("author"),
  }),
})
export interface IUser extends InferEntity<typeof UserEntity> {}
export const User = mikroSilk(UserEntity)

const PostEntity = defineEntity({
  name: "Post",
  properties: (p) => ({
    id: p.integer().primary().autoincrement(),
    title: p.string(),
    author: () => p.manyToOne(UserEntity),
  }),
})
export interface IPost extends InferEntity<typeof PostEntity> {}
export const Post = mikroSilk(PostEntity)

// @filename: resolver.ts
// ---cut---
import { field, resolver } from "@gqloom/core"
import * as v from "valibot"
import { type IUser, User } from "./entities"

export const userResolver = resolver.of(User, {
  display: field(v.string())
    .derivedFrom("name", "email")
    .resolve((user) => {
      return `${user.name} <${user.email}>`
    }),
})
```
注意：派生字段需要使用 `derivedFrom` 方法声明所依赖的列，以便 `useSelectedFields` 方法能正确地选取所需要的列。

### 隐藏字段

`@gqloom/mikro-orm` 默认将暴露所有字段。如果你希望隐藏某些字段，例如密码，你可以使用 `field.hidden`：

```ts twoslash
// @filename: entities.ts
import { mikroSilk } from "@gqloom/mikro-orm"
import { type InferEntity, defineEntity } from "@mikro-orm/core"

const UserEntity = defineEntity({
  name: "User",
  properties: (p) => ({
    id: p.integer().primary().autoincrement(),
    email: p.string(),
    name: p.string(),
    password: p.string(),
  }),
})
export interface IUser extends InferEntity<typeof UserEntity> {}
export const User = mikroSilk(UserEntity)

// @filename: index.ts
// ---cut---
import { field, resolver } from "@gqloom/core"
import { User } from "./entities"

export const userResolver = resolver.of(User, {
  password: field.hidden,
})
```

在上面的代码中，我们隐藏了 `password` 字段，这意味着它将不会出现在生成的 GraphQL Schema 中。

### 混合字段

在定义数据库实体时，我们有时会使用 `json`, `enum` 这样的字段，同时希望在 TypeScript 和 GraphQL 中都能正确地推导出类型，我们可以借助像 `valibot` 或 `zod` 这样的库来定义这些字段：

<Tabs groupId="schema-library">
<template #Valibot>

<<< @/snippets/code/mikro-valibot.ts{ts twoslash}

</template>
<template #Zod>

<<< @/snippets/code/mikro-zod.ts{ts twoslash}

</template>
</Tabs>

## 解析器工厂

`@gqloom/mikro-orm` 提供了 `MikroResolverFactory` 来帮助你创建解析器工厂。
使用解析器工厂，你可以快速定义常用的查询、变更和字段，解析器工厂还预置了常见操作的输入类型，使用解析器工厂可以大大减少样板代码，这在快速开发时非常有用。

```ts twoslash
// @filename: entities.ts
import { mikroSilk } from "@gqloom/mikro-orm"
import { type InferEntity, defineEntity } from "@mikro-orm/core"

const UserEntity = defineEntity({
  name: "User",
  properties: (p) => ({
    id: p.integer().primary().autoincrement(),
    createdAt: p.datetime().onCreate(() => new Date()),
    email: p.string(),
    name: p.string(),
    role: p.string().$type<"admin" | "user">().default("user"),
    posts: () => p.oneToMany(PostEntity).mappedBy("author"),
  }),
})
export interface IUser extends InferEntity<typeof UserEntity> {}
export const User = mikroSilk(UserEntity)

const PostEntity = defineEntity({
  name: "Post",
  properties: (p) => ({
    id: p.integer().primary().autoincrement(),
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
    published: p.boolean().default(false),
    title: p.string(),
    author: () => p.manyToOne(UserEntity),
  }),
})
export interface IPost extends InferEntity<typeof PostEntity> {}
export const Post = mikroSilk(PostEntity)

// @filename: provider.ts
import { createMemoization } from "@gqloom/core/context"
import { MikroORM } from "@mikro-orm/libsql"
import { Post as PostEntity, User as UserEntity } from "./entities"
export let orm: MikroORM
export const ormPromise = MikroORM.init({
  entities: [UserEntity, PostEntity],
  dbName: ":memory:",
}).then(async (o: MikroORM) => {
  orm = o
  await orm.getSchemaGenerator().updateSchema()
})
export const useEm = createMemoization(() => orm.em.fork())

// @filename: index.ts
// ---cut---
import { MikroResolverFactory } from "@gqloom/mikro-orm"
import { Post, User } from "./entities"
import { useEm } from "./provider"

export const userResolverFactory = new MikroResolverFactory(User, useEm)
export const postResolverFactory = new MikroResolverFactory(Post, useEm)
```

在上面的代码中，我们为 `User` 和 `Post` 模型创建了的解析器工厂。`MikroResolverFactory` 接受两个参数，第一个是作为丝线的实体，第二个是返回 `EntityManager` 实例的函数。

### 关系字段

解析器工厂提供了 `referenceField` 和 `collectionField` 方法来定义关系字段：

```ts twoslash
// @filename: entities.ts
import { mikroSilk } from "@gqloom/mikro-orm"
import { type InferEntity, defineEntity } from "@mikro-orm/core"

const UserEntity = defineEntity({
  name: "User",
  properties: (p) => ({
    id: p.integer().primary().autoincrement(),
    email: p.string(),
    name: p.string(),
    posts: () => p.oneToMany(PostEntity).mappedBy("author"),
  }),
})
export interface IUser extends InferEntity<typeof UserEntity> {}
export const User = mikroSilk(UserEntity)

const PostEntity = defineEntity({
  name: "Post",
  properties: (p) => ({
    id: p.integer().primary().autoincrement(),
    title: p.string(),
    author: () => p.manyToOne(UserEntity),
  }),
})
export interface IPost extends InferEntity<typeof PostEntity> {}
export const Post = mikroSilk(PostEntity)
// @filename: provider.ts
import { createMemoization } from "@gqloom/core/context"
import { MikroORM } from "@mikro-orm/libsql"
import { Post as PostEntity, User as UserEntity } from "./entities"
export let orm: MikroORM
export const ormPromise = MikroORM.init({
  entities: [UserEntity, PostEntity],
  dbName: ":memory:",
}).then(async (o: MikroORM) => {
  orm = o
  await orm.getSchemaGenerator().updateSchema()
})
export const useEm = createMemoization(() => orm.em.fork())
// @filename: index.ts
// ---cut---
import { field, query, resolver } from "@gqloom/core"
import { MikroResolverFactory } from "@gqloom/mikro-orm"
import * as v from "valibot"
import { Post, User } from "./entities"
import { useEm } from "./provider"

export const userResolverFactory = new MikroResolverFactory(User, useEm)
export const postResolverFactory = new MikroResolverFactory(Post, useEm)

export const userResolver = resolver.of(User, {
  user: userResolverFactory.findOneQuery(),
  posts: userResolverFactory.collectionField('posts'),
})

export const postResolver = resolver.of(Post, {
  author: postResolverFactory.referenceField('author'),
})
```

在上面的代码中，我们使用 `userResolverFactory.collectionField('posts')` 和 `postResolverFactory.referenceField('author')` 来定义关系字段。`collectionField` 用于 `one-to-many` 和 `many-to-many` 关系，而 `referenceField` 用于 `many-to-one` 和 `one-to-one` 关系。

### 查询

解析器工厂预置了常用的查询：
  - [countQuery](https://mikro-orm.io/api/core/class/EntityRepository#count)
  - [findQuery](https://mikro-orm.io/api/core/class/EntityRepository#find)
  - [findAndCountQuery](https://mikro-orm.io/api/core/class/EntityRepository#findAndCount)
  - [findByCursorQuery](https://mikro-orm.io/api/core/class/EntityRepository#findByCursor)
  - [findOneQuery](https://mikro-orm.io/api/core/class/EntityRepository#findOne)
  - [findOneOrFailQuery](https://mikro-orm.io/api/core/class/EntityRepository#findOneOrFail)

你可以直接使用它们：

```ts twoslash
// @filename: entities.ts
import { mikroSilk } from "@gqloom/mikro-orm"
import { type InferEntity, defineEntity } from "@mikro-orm/core"

const UserEntity = defineEntity({
  name: "User",
  properties: (p) => ({
    id: p.integer().primary().autoincrement(),
    email: p.string(),
    name: p.string(),
    posts: () => p.oneToMany(PostEntity).mappedBy("author"),
  }),
})
export interface IUser extends InferEntity<typeof UserEntity> {}
export const User = mikroSilk(UserEntity)

const PostEntity = defineEntity({
  name: "Post",
  properties: (p) => ({
    id: p.integer().primary().autoincrement(),
    title: p.string(),
    author: () => p.manyToOne(UserEntity),
  }),
})
export interface IPost extends InferEntity<typeof PostEntity> {}
export const Post = mikroSilk(PostEntity)
// @filename: provider.ts
import { createMemoization } from "@gqloom/core/context"
import { MikroORM } from "@mikro-orm/libsql"
import { Post as PostEntity, User as UserEntity } from "./entities"
export let orm: MikroORM
export const ormPromise = MikroORM.init({
  entities: [UserEntity, PostEntity],
  dbName: ":memory:",
}).then(async (o: MikroORM) => {
  orm = o
  await orm.getSchemaGenerator().updateSchema()
})
export const useEm = createMemoization(() => orm.em.fork())
// @filename: index.ts
// ---cut---
import { query, resolver } from "@gqloom/core"
import { MikroResolverFactory } from "@gqloom/mikro-orm"
import * as v from "valibot"
import { User } from "./entities"
import { useEm } from "./provider"

export const userResolverFactory = new MikroResolverFactory(User, useEm)

export const userResolver = resolver.of(User, {
  user: userResolverFactory.findOneQuery(),
  posts: userResolverFactory.collectionField('posts'),
})
```

在上面的代码中，我们使用 `userResolverFactory.findOneQuery()` 来定义 `user` 查询。解析器工厂将自动创建输入类型和解析函数。

### 变更

解析器工厂预置了常用的变更：
  - [createMutation](https://mikro-orm.io/api/core/class/EntityRepository#create)
  - [insertMutation](https://mikro-orm.io/api/core/class/EntityRepository#insert)
  - [insertManyMutation](https://mikro-orm.io/api/core/class/EntityRepository#insertMany)
  - [deleteMutation](https://mikro-orm.io/api/core/class/EntityRepository#nativeDelete)
  - [updateMutation](https://mikro-orm.io/api/core/class/EntityRepository#nativeUpdate)
  - [upsertMutation](https://mikro-orm.io/api/core/class/EntityRepository#upsert)
  - [upsertManyMutation](https://mikro-orm.io/api/core/class/EntityRepository#upsertMany)

你可以直接使用它们：

```ts twoslash
// @filename: entities.ts
import { mikroSilk } from "@gqloom/mikro-orm"
import { type InferEntity, defineEntity } from "@mikro-orm/core"

const UserEntity = defineEntity({
  name: "User",
  properties: (p) => ({
    id: p.integer().primary().autoincrement(),
    email: p.string(),
    name: p.string(),
    posts: () => p.oneToMany(PostEntity).mappedBy("author"),
  }),
})
export interface IUser extends InferEntity<typeof UserEntity> {}
export const User = mikroSilk(UserEntity)

const PostEntity = defineEntity({
  name: "Post",
  properties: (p) => ({
    id: p.integer().primary().autoincrement(),
    title: p.string(),
    author: () => p.manyToOne(UserEntity),
  }),
})
export interface IPost extends InferEntity<typeof PostEntity> {}
export const Post = mikroSilk(PostEntity)
// @filename: provider.ts
import { createMemoization } from "@gqloom/core/context"
import { MikroORM } from "@mikro-orm/libsql"
import { Post as PostEntity, User as UserEntity } from "./entities"
export let orm: MikroORM
export const ormPromise = MikroORM.init({
  entities: [UserEntity, PostEntity],
  dbName: ":memory:",
}).then(async (o: MikroORM) => {
  orm = o
  await orm.getSchemaGenerator().updateSchema()
})
export const useEm = createMemoization(() => orm.em.fork())
// @filename: index.ts
// ---cut---
import { resolver } from "@gqloom/core"
import { MikroResolverFactory } from "@gqloom/mikro-orm"
import { Post } from "./entities"
import { useEm } from "./provider"

export const postResolverFactory = new MikroResolverFactory(Post, useEm)

export const postResolver = resolver.of(Post, {
  createPost: postResolverFactory.createMutation(),
  author: postResolverFactory.referenceField('author'),
})
```

在上面的代码中，我们使用 `postResolverFactory.createMutation()` 来定义 `createPost` 变更。工厂将自动创建输入类型和解析函数。

### 自定义输入字段

解析器工厂默认预置的输入是可以配置的，通过在构造 `MikroResolverFactory` 时传入 `input` 选项，可以配置各个字段的输入验证行为和展示行为：

```ts twoslash
import { createMemoization } from "@gqloom/core/context"
import { type InferEntity, defineEntity } from "@mikro-orm/core"
import { EntityManager } from "@mikro-orm/libsql"

const User = defineEntity({
  name: "User",
  properties: (p) => ({
    id: p.integer().primary().autoincrement(),
    createdAt: p.datetime().onCreate(() => new Date()),
    email: p.string(),
    name: p.string(),
    password: p.string().nullable(),
    role: p.string().$type<"admin" | "user">().default("user"),
  }),
})
export interface IUser extends InferEntity<typeof User> {}

const useEm = createMemoization(() => ({}) as EntityManager)

// ---cut---
import { field } from "@gqloom/core"
import { MikroResolverFactory } from "@gqloom/mikro-orm"
import * as v from "valibot"

const userFactory = new MikroResolverFactory(User, {
  getEntityManager: useEm,
  input: {
    email: v.pipe(v.string(), v.email()), // 验证邮箱格式 [!code hl]
    password: {
      filters: field.hidden, // 在查询过滤器中隐藏该字段 [!code hl]
      create: v.pipe(v.string(), v.minLength(6)), // 在创建时验证最小长度为6 [!code hl]
      update: v.pipe(v.string(), v.minLength(6)), // 在更新时验证最小长度为6 [!code hl]
    },
  },
})
```

### 自定义输入对象

解析器工厂预置的查询和变更支持自定义输入对象，你可以通过 `input` 选项来定义输入类型：

```ts twoslash
// @filename: entities.ts
import { mikroSilk } from "@gqloom/mikro-orm"
import { type InferEntity, defineEntity } from "@mikro-orm/core"

const UserEntity = defineEntity({
  name: "User",
  properties: (p) => ({
    id: p.integer().primary().autoincrement(),
    email: p.string(),
    name: p.string(),
  }),
})
export interface IUser extends InferEntity<typeof UserEntity> {}
export const User = mikroSilk(UserEntity)
// @filename: provider.ts
import { createMemoization } from "@gqloom/core/context"
import { MikroORM } from "@mikro-orm/libsql"
import { User as UserEntity } from "./entities"
export let orm: MikroORM
export const ormPromise = MikroORM.init({
  entities: [UserEntity],
  dbName: ":memory:",
}).then(async (o: MikroORM) => {
  orm = o
  await orm.getSchemaGenerator().updateSchema()
})
export const useEm = createMemoization(() => orm.em.fork())
// @filename: index.ts
// ---cut---
import { resolver } from "@gqloom/core"
import { MikroResolverFactory } from "@gqloom/mikro-orm"
import * as v from "valibot"
import { User } from "./entities"
import { useEm } from "./provider"

export const userResolverFactory = new MikroResolverFactory(User, useEm)

export const userResolver = resolver.of(User, {
  user: userResolverFactory.findOneQuery().input(
    v.pipe(
      v.object({ id: v.number() }),
      v.transform(({ id }) => ({ where: { id } }))
    )
  ),
})
```

在上面的代码中，我们使用 `valibot` 来定义输入类型，`v.object({ id: v.number() })` 定义了输入对象的类型，`v.transform(({ id }) => ({ where: { id } }))` 将输入参数转换为 MikroORM 的查询参数。

### 添加中间件

解析器工厂预置的查询、变更和字段支持添加中间件，你可以通过 `use` 方法来添加中间件：

```ts twoslash
// @filename: entities.ts
import { mikroSilk } from "@gqloom/mikro-orm"
import { type InferEntity, defineEntity } from "@mikro-orm/core"
const UserEntity = defineEntity({
  name: "User",
  properties: (p) => ({ id: p.integer().primary().autoincrement(), name: p.string() }),
})
export const User = mikroSilk(UserEntity)
const PostEntity = defineEntity({
  name: "Post",
  properties: (p) => ({
    id: p.integer().primary().autoincrement(),
    title: p.string(),
    author: () => p.manyToOne(UserEntity),
  }),
})
export const Post = mikroSilk(PostEntity)
// @filename: provider.ts
import { createMemoization } from "@gqloom/core/context"
import { MikroORM } from "@mikro-orm/libsql"
import { Post as PostEntity, User as UserEntity } from "./entities"
export let orm: MikroORM
export const ormPromise = MikroORM.init({
  entities: [UserEntity, PostEntity],
  dbName: ":memory:",
}).then(async (o: MikroORM) => {
  orm = o
  await orm.getSchemaGenerator().updateSchema()
})
export const useEm = createMemoization(() => orm.em.fork())
// @filename: index.ts
// ---cut---
import { resolver } from "@gqloom/core"
import { createMemoization } from "@gqloom/core/context"
import { MikroResolverFactory } from "@gqloom/mikro-orm"
import { GraphQLError } from "graphql"
import { Post } from "./entities"
import { useEm } from "./provider"

const postResolverFactory = new MikroResolverFactory(Post, useEm)
const useAuthedUser = createMemoization(async () => ({ id: 1, name: "test" }))

const postResolver = resolver.of(Post, {
  createPost: postResolverFactory.createMutation().use(async (next) => {
    const user = await useAuthedUser()
    if (user == null) throw new GraphQLError("Please login first")
    return next()
  }),
})
```

在上面的代码中，我们使用 `use` 方法来添加一个中间件，`useAuthedUser()` 是一个自定义的函数，用于获取当前登录的用户，如果用户未登录，则抛出一个错误，否则调用 `next()` 继续执行。

### 完整解析器

你可以从解析器工厂中直接创建一个完整解析器：

```ts twoslash
// @filename: entities.ts
import { mikroSilk } from "@gqloom/mikro-orm"
import { type InferEntity, defineEntity } from "@mikro-orm/core"

const UserEntity = defineEntity({
  name: "User",
  properties: (p) => ({
    id: p.integer().primary().autoincrement(),
    email: p.string(),
    name: p.string(),
    posts: () => p.oneToMany(PostEntity).mappedBy("author"),
  }),
})
export const User = mikroSilk(UserEntity)

const PostEntity = defineEntity({
  name: "Post",
  properties: (p) => ({
    id: p.integer().primary().autoincrement(),
    title: p.string(),
    author: () => p.manyToOne(UserEntity),
  }),
})
export const Post = mikroSilk(PostEntity)
// @filename: provider.ts
import { createMemoization } from "@gqloom/core/context"
import { MikroORM } from "@mikro-orm/libsql"
import { Post as PostEntity, User as UserEntity } from "./entities"
export let orm: MikroORM
export const ormPromise = MikroORM.init({
  entities: [UserEntity, PostEntity],
  dbName: ":memory:",
}).then(async (o: MikroORM) => {
  orm = o
  await orm.getSchemaGenerator().updateSchema()
})
export const useEm = createMemoization(() => orm.em.fork())
// @filename: index.ts
// ---cut---
import { MikroResolverFactory } from "@gqloom/mikro-orm"
import { User } from "./entities"
import { useEm } from "./provider"

export const userResolverFactory = new MikroResolverFactory(User, useEm)

// Readonly Resolver
const userQueriesResolver = userResolverFactory.queriesResolver()

// Full Resolver
const userResolver = userResolverFactory.resolver()
```

有两个用于创建 Resolver 的函数：

- `usersResolverFactory.queriesResolver()`: 创建一个只包含查询、关系字段的 Resolver。
- `usersResolverFactory.resolver()`: 创建一个包含所有查询、变更和关系字段的 Resolver。

## 自定义类型映射

为了适应更多的 MikroORM 类型，我们可以拓展 GQLoom 为其添加更多的类型映射。

首先我们使用 `MikroWeaver.config` 来定义类型映射的配置。这里我们导入来自 [graphql-scalars](https://the-guild.dev/graphql/scalars) 的 `GraphQLDateTime`，当遇到 `datetime` 类型时，我们将其映射到对应的 GraphQL 标量。

```ts twoslash
import { MikroWeaver } from "@gqloom/mikro-orm"
import { GraphQLDateTime } from "graphql-scalars"

export const mikroWeaverConfig = MikroWeaver.config({
  presetGraphQLType: (property) => {
    if (property.type === "datetime") {
      return GraphQLDateTime
    }
  },
})
```

在编织 GraphQL Schema 时传入配置到 weave 函数中：

```ts
export const schema = weave(mikroWeaverConfig, userResolver, postResolver)
```

## 默认类型映射

下表列出了 GQLoom 中 MikroORM 类型与 GraphQL 类型之间的默认映射关系：

| MikroORM 类型 | GraphQL 类型     |
| ------------- | ---------------- |
| (primary)     | `GraphQLID`      |
| string        | `GraphQLString`  |
| number        | `GraphQLFloat`   |
| float         | `GraphQLFloat`   |
| double        | `GraphQLFloat`   |
| decimal       | `GraphQLFloat`   |
| integer       | `GraphQLInt`     |
| smallint      | `GraphQLInt`     |
| mediumint     | `GraphQLInt`     |
| tinyint       | `GraphQLInt`     |
| bigint        | `GraphQLInt`     |
| boolean       | `GraphQLBoolean` |
| (other)       | `GraphQLString`  |