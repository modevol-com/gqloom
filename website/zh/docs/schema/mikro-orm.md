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

`mikroSilk(Entity, config?)` 的第二个参数可选，用于设置 GraphQL 类型描述（`description`）、覆盖或隐藏字段（`fields`）等，详见类型 `MikroSilkConfig`。

### 使用装饰器定义实体

除了 `defineEntity`，你也可以用 MikroORM 的**装饰器 + 类**定义实体（`@Entity()`、`@Property()`、`@PrimaryKey()`、`@ManyToOne()`、`@OneToMany()` 等）。使用 class 实体时，必须通过 **MikroWeaver.config** 提供 `metadata`，这样织 Schema 和解析器工厂才能解析类名到元数据。

1. 在应用入口最顶部 `import "reflect-metadata"`，并安装依赖 `reflect-metadata`。
2. 初始化 ORM 后，用 `MikroWeaver.config({ metadata: orm.getMetadata() })` 得到 weaver 配置（也支持 `metadata: () => orm.getMetadata()` 的 getter 形式）。
3. 织 Schema 时把该配置作为 `weave` 的第一个参数传入；若在 `weave` 之外调用 `getGraphQLType(silk)` 或 `factory.queriesResolver()` / `resolver()`，需在**同一 weaver context** 下执行（例如先 `initWeaverContext()`、`ctx.setConfig(weaverConfig)`，再用 `provideWeaverContext(callback, ctx)` 包住这些调用）。

```ts
import "reflect-metadata"
import {
  Collection,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
} from "@mikro-orm/core"
import { query, resolver, weave } from "@gqloom/core"
import { MikroWeaver, mikroSilk } from "@gqloom/mikro-orm"

@Entity()
class Author {
  @PrimaryKey() id!: number
  @Property() name!: string
  @OneToMany(() => Book, (b) => b.author)
  books = new Collection<Book>(this)
}

@Entity()
class Book {
  @PrimaryKey() id!: number
  @Property() title!: string
  @ManyToOne(() => Author, { ref: true }) author!: Author
}

// 初始化 ORM 后
const weaverConfig = MikroWeaver.config({ metadata: orm.getMetadata() })
const AuthorSilk = mikroSilk(Author)
const BookSilk = mikroSilk(Book)

// 织 Schema 时传入 weaverConfig
const schema = weave(weaverConfig, resolver({ author: query(AuthorSilk, ...), book: query(BookSilk, ...) }))
```

使用解析器工厂时，在**已设置 weaver config 的 context** 下构建 resolver（这样工厂才能通过 `getWeaverConfigMetadata()` 解析 class 实体），例如：

```ts
import { initWeaverContext, provideWeaverContext, weave } from "@gqloom/core"

const ctx = initWeaverContext()
ctx.setConfig(weaverConfig)
const schema = provideWeaverContext(() => {
  const authorResolver = authorFactory.queriesResolver("Author")
  const bookResolver = bookFactory.queriesResolver("Book")
  return weave(weaverConfig, authorResolver, bookResolver)
}, ctx)
```

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

在上面的代码中，我们为 `User` 和 `Post` 模型创建了解析器工厂。`MikroResolverFactory` 的构造函数有两种写法：

- **简写**：`new MikroResolverFactory(Entity, getEntityManager)`，其中 `getEntityManager` 是 `(payload?) => EntityManager | Promise<EntityManager>`。
- **完整选项**：`new MikroResolverFactory(Entity, { getEntityManager, input?, metadata? })`。其中 `input` 用于配置各字段在 filter/create/update 中的可见性与校验；`metadata` 仅在**装饰器（class）实体**时需要，且**已弃用**，推荐通过 **MikroWeaver.config({ metadata: orm.getMetadata() })** 统一设置，织 Schema 时把该 config 传给 `weave`，并在需要时用 `provideWeaverContext` 包住构建 resolver 的代码。

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

解析器工厂预置了常用查询（内部通过 EntityManager 的 `em.count()`、`em.find()` 等方法实现）：
  - [countQuery](https://mikro-orm.io/api/core/class/EntityManager#count)
  - [findQuery](https://mikro-orm.io/api/core/class/EntityManager#find)
  - [findAndCountQuery](https://mikro-orm.io/api/core/class/EntityManager#findAndCount)
  - [findByCursorQuery](https://mikro-orm.io/api/core/class/EntityManager#findByCursor)
  - [findOneQuery](https://mikro-orm.io/api/core/class/EntityManager#findOne)
  - [findOneOrFailQuery](https://mikro-orm.io/api/core/class/EntityManager#findOneOrFail)

查询的 `where` 参数会生成 **Filter** 类型，支持 `eq`、`gt`、`gte`、`lt`、`lte`、`in`、`nin`、`ne` 等比较操作符；通过 **MikroWeaver.config** 的 **dialect** 可控制是否暴露 PostgreSQL 专有操作符（如 `ilike`、`overlap`、`contains`），避免在 SQLite/MySQL 下生成不支持的 API。

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

解析器工厂预置了常用变更（内部通过 EntityManager 的 `em.create()`、`em.nativeUpdate()` 等方法实现）：
  - [createMutation](https://mikro-orm.io/api/core/class/EntityManager#create)
  - [insertMutation](https://mikro-orm.io/api/core/class/EntityManager#insert)
  - [insertManyMutation](https://mikro-orm.io/api/core/class/EntityManager#insertMany)
  - [deleteMutation](https://mikro-orm.io/api/core/class/EntityManager#nativeDelete)
  - [updateMutation](https://mikro-orm.io/api/core/class/EntityManager#nativeUpdate)
  - [upsertMutation](https://mikro-orm.io/api/core/class/EntityManager#upsert)
  - [upsertManyMutation](https://mikro-orm.io/api/core/class/EntityManager#upsertMany)

**说明**：`createMutation`、`insertMutation`、`insertManyMutation` 等已内置在变更完成后调用 `em.flush()`，一般无需再包一层 flusher 中间件。

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
import { MikroResolverFactory } from "@gqloom/mikro-orm"
import * as v from "valibot"

const userFactory = new MikroResolverFactory(User, {
  getEntityManager: useEm,
  input: {
    email: v.pipe(v.string(), v.email()), // 验证邮箱格式 [!code hl]
    password: {
      filters: false, // 在查询过滤器中隐藏该字段 [!code hl]
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

// Readonly Resolver（仅查询 + 关系字段）
const userQueriesResolver = userResolverFactory.queriesResolver()

// Full Resolver（查询 + 变更 + 关系字段）
const userResolver = userResolverFactory.resolver()
```

有两个用于创建 Resolver 的方法：

- **`userResolverFactory.queriesResolver(name?)`**：创建只包含查询和关系字段的 Resolver。可选参数 `name` 用于生成字段名（如不传则使用实体的 name/className）。
- **`userResolverFactory.resolver(name?)`**：创建包含所有查询、变更和关系字段的完整 Resolver。

生成的字段命名规则（以 `name = "User"` 为例）：查询有 `countUser`、`findUser`、`findUserByCursor`、`findOneUser`、`findOneUserOrFail`；变更有 `createUser`、`insertUser`、`insertManyUser`、`deleteUser`、`updateUser`、`upsertUser`、`upsertManyUser`；实体上的关系属性（如 `posts`、`author`）会原样暴露。工厂内部使用 MikroORM 的 **EntityManager** 方法（如 `em.count()`、`em.find()` 等）实现这些操作。

## Weaver 配置（MikroWeaver.config）

`MikroWeaver.config(options)` 用于在织 Schema 时统一配置行为，建议在应用里创建一次，并在 `weave` 时作为第一个参数传入。

### 配置项

| 选项                  | 类型                                                                  | 说明                                                                                                                                                                                  |
| --------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **presetGraphQLType** | `(property) => GraphQLOutputType \| undefined`                        | 为指定属性覆盖默认的 GraphQL 输出类型（见下方「自定义类型映射」）。                                                                                                                   |
| **dialect**           | `"PostgreSQL"` \| `"MySQL"` \| `"SQLite"` \| `"MongoDB"` 等 \| `null` | 数据库方言。用于控制 Filter 中是否暴露 PostgreSQL 专有操作符（如 `ilike`、`overlap`、`contains`）；设为 SQLite/MySQL 等时可避免生成不支持的比较操作符。不设时按兼容 PostgreSQL 处理。 |
| **metadata**          | `MetadataStorage \| (() => MetadataStorage)`                          | MikroORM 的元数据存储。**使用装饰器（class）实体时必设**，推荐 `metadata: orm.getMetadata()` 或 `metadata: () => orm.getMetadata()`。使用 `defineEntity`（EntitySchema）时可省略。    |

### 自定义类型映射

为了适应更多的 MikroORM 类型，可以在 `MikroWeaver.config` 中设置 `presetGraphQLType`。例如使用 [graphql-scalars](https://the-guild.dev/graphql/scalars) 的 `GraphQLDateTime`，将 `datetime` 类型映射到对应 GraphQL 标量（更稳妥的写法是用 `Object.is(property.type, DateTimeType)`，需从 `@mikro-orm/core` 导入 `DateTimeType`）：

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

编织 GraphQL Schema 时传入配置：

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