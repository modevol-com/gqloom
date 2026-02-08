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

只需要使用 `mikroSilk` 包裹 MikroORM Entity，即可将它们作为[丝线](../silk)使用。定义实体的方式有两种：

<Tabs groupId="entity-definition">
<template #defineEntity>

使用 `defineEntity` 定义实体时，用 `mikroSilk` 包裹即可。在解析器中使用之前需初始化 MikroORM，示例如下：

::: code-group

```ts twoslash [entities.ts]
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
    author: () => p.manyToOne(UserEntity).ref(),
  }),
})
export interface IPost extends InferEntity<typeof PostEntity> {}

export const User = mikroSilk(UserEntity)
export const Post = mikroSilk(PostEntity)
```

```ts twoslash [provider.ts]
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
    author: () => p.manyToOne(UserEntity).ref(),
  }),
})
export interface IPost extends InferEntity<typeof PostEntity> {}

export const User = mikroSilk(UserEntity)
export const Post = mikroSilk(PostEntity)

// @filename: provider.ts
// ---cut---
import { createMemoization } from "@gqloom/core/context"
import { MikroORM } from "@mikro-orm/libsql"
import { Post, User } from "./entities"

export const orm = MikroORM.initSync({
  entities: [User, Post],
  dbName: ":memory:",
})

export const useEm = createMemoization(() => orm.em.fork())
```

```ts twoslash [index.ts]
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
    author: () => p.manyToOne(UserEntity).ref(),
  }),
})
export interface IPost extends InferEntity<typeof PostEntity> {}

export const User = mikroSilk(UserEntity)
export const Post = mikroSilk(PostEntity)

// @filename: provider.ts
import { createMemoization } from "@gqloom/core/context"
import { MikroORM } from "@mikro-orm/libsql"
import { Post, User } from "./entities"

export const orm = MikroORM.initSync({
  entities: [User, Post],
  dbName: ":memory:",
})

export const useEm = createMemoization(() => orm.em.fork())

// @filename: index.ts
// ---cut---
import { weave } from "@gqloom/core"
import { MikroResolverFactory } from "@gqloom/mikro-orm"
import { Post, User } from "./entities"
import { useEm } from "./provider"

const userResolver = new MikroResolverFactory(User, useEm).resolver()
const postResolver = new MikroResolverFactory(Post, useEm).resolver()

export const schema = weave(userResolver, postResolver)
```

:::

</template>
<template #装饰器与类>

使用装饰器定义实体时，只需用 `mikroSilk` 包裹实体类。由于类实体需要从 MikroORM 的元数据中解析，在 `weave` 时需通过 `MikroWeaver.config` 提供 `metadata`。

> [!IMPORTANT]
> 使用装饰器时，请确保在应用入口顶部导入 `reflect-metadata` 并安装该依赖。

::: code-group

```ts twoslash [entities.ts]
import "reflect-metadata"
import { mikroSilk } from "@gqloom/mikro-orm"
import { Collection, Entity, ManyToOne, OneToMany, PrimaryKey, Property } from "@mikro-orm/core"

@Entity()
export class AuthorEntity {
  @PrimaryKey({ autoincrement: true })
  public id!: number

  @Property()
  public name!: string

  @OneToMany(() => BookEntity, (b) => b.author)
  public books = new Collection<BookEntity>(this)
}

@Entity()
export class BookEntity {
  @PrimaryKey({ autoincrement: true })
  public id!: number

  @Property()
  public title!: string

  @ManyToOne(() => AuthorEntity, { ref: true })
  public author!: AuthorEntity
}

export const Author = mikroSilk(AuthorEntity)
export const Book = mikroSilk(BookEntity)
```

```ts twoslash [provider.ts]
// @filename: entities.ts
import "reflect-metadata"
import { mikroSilk } from "@gqloom/mikro-orm"
import { Collection, Entity, ManyToOne, OneToMany, PrimaryKey, Property } from "@mikro-orm/core"

@Entity()
export class AuthorEntity {
  @PrimaryKey({ autoincrement: true })
  public id!: number
  @Property()
  public name!: string
  @OneToMany(() => BookEntity, (b) => b.author)
  public books = new Collection<BookEntity>(this)
}

@Entity()
export class BookEntity {
  @PrimaryKey({ autoincrement: true })
  public id!: number
  @Property()
  public title!: string
  @ManyToOne(() => AuthorEntity, { ref: true })
  public author!: AuthorEntity
}

export const Author = mikroSilk(AuthorEntity)
export const Book = mikroSilk(BookEntity)

// @filename: provider.ts
// ---cut---
import { createMemoization } from "@gqloom/core/context"
import { MikroORM } from "@mikro-orm/libsql"
import { Author, Book } from "./entities"

export const orm = MikroORM.initSync({
  entities: [Author, Book],
  dbName: ":memory:",
})

export const useEm = createMemoization(() => orm.em.fork())
```

```ts twoslash [index.ts]
// @filename: entities.ts
import "reflect-metadata"
import { mikroSilk } from "@gqloom/mikro-orm"
import { Collection, Entity, ManyToOne, OneToMany, PrimaryKey, Property } from "@mikro-orm/core"

@Entity()
export class AuthorEntity {
  @PrimaryKey({ autoincrement: true })
  public id!: number
  @Property()
  public name!: string
  @OneToMany(() => BookEntity, (b) => b.author)
  public books = new Collection<BookEntity>(this)
}

@Entity()
export class BookEntity {
  @PrimaryKey({ autoincrement: true })
  public id!: number
  @Property()
  public title!: string
  @ManyToOne(() => AuthorEntity, { ref: true })
  public author!: AuthorEntity
}

export const Author = mikroSilk(AuthorEntity)
export const Book = mikroSilk(BookEntity)

// @filename: provider.ts
import { createMemoization } from "@gqloom/core/context"
import { MikroORM } from "@mikro-orm/libsql"
import { Author, Book } from "./entities"

export const orm = MikroORM.initSync({
  entities: [Author, Book],
  dbName: ":memory:",
})

export const useEm = createMemoization(() => orm.em.fork())

// @filename: index.ts
// ---cut---
import { weave } from "@gqloom/core"
import { MikroWeaver, MikroResolverFactory } from "@gqloom/mikro-orm"
import { Author, Book } from "./entities"
import { orm, useEm } from "./provider"

const authorResolver = new MikroResolverFactory(Author, useEm).resolver()
const bookResolver = new MikroResolverFactory(Book, useEm).resolver()

export const schema = weave(
  MikroWeaver.config({ metadata: orm.getMetadata() }),
  authorResolver,
  bookResolver
)
```

:::

</template>
</Tabs>

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
    author: () => p.manyToOne(UserEntity).ref(),
  }),
})
export interface IPost extends InferEntity<typeof PostEntity> {}
export const User = mikroSilk(UserEntity)
export const Post = mikroSilk(PostEntity)
// @filename: provider.ts
import type { Middleware } from "@gqloom/core"
import { createMemoization, useResolvingFields } from "@gqloom/core/context"
import { MikroORM } from "@mikro-orm/libsql"
import { Post, User } from "./entities"
export const orm = MikroORM.initSync({
  entities: [User, Post],
  dbName: ":memory:",
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
    author: () => p.manyToOne(UserEntity).ref(),
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
    author: () => p.manyToOne(UserEntity).ref(),
  }),
})
export interface IPost extends InferEntity<typeof PostEntity> {}
export const Post = mikroSilk(PostEntity)

// @filename: provider.ts
import { createMemoization } from "@gqloom/core/context"
import { MikroORM } from "@mikro-orm/libsql"
import { Post, User } from "./entities"
export const orm = MikroORM.initSync({
  entities: [User, Post],
  dbName: ":memory:",
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

在上面的代码中，我们为 `User` 和 `Post` 模型创建了解析器工厂。`MikroResolverFactory` 的构造函数有两种用法：一是传入实体和返回 `EntityManager` 的函数，即 `new MikroResolverFactory(Entity, getEntityManager)`；二是传入实体和选项对象 `{ getEntityManager, input?, metadata? }`。其中 `input` 用于配置各字段在 filter / create / update 中的可见性与校验；`metadata` 仅在**使用装饰器定义的类实体**时需要，用于从类解析出实体元数据，但该选项已弃用，推荐统一通过 **MikroWeaver.config({ metadata: orm.getMetadata() })** 设置，并在织 Schema 时传入该配置。

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
    author: () => p.manyToOne(UserEntity).ref(),
  }),
})
export interface IPost extends InferEntity<typeof PostEntity> {}
export const Post = mikroSilk(PostEntity)
// @filename: provider.ts
import { createMemoization } from "@gqloom/core/context"
import { MikroORM } from "@mikro-orm/libsql"
import { Post, User } from "./entities"

export const orm = MikroORM.initSync({
  entities: [User, Post],
  dbName: ":memory:",
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

解析器工厂预置了常用的查询（内部通过 EntityManager 的对应方法实现）：
  - [countQuery](https://mikro-orm.io/api/core/class/EntityRepository#count) — 计数
  - [findQuery](https://mikro-orm.io/api/core/class/EntityRepository#find) — 列表查询
  - [findAndCountQuery](https://mikro-orm.io/api/core/class/EntityRepository#findAndCount) — 列表 + 总数
  - [findByCursorQuery](https://mikro-orm.io/api/core/class/EntityRepository#findByCursor) — 游标分页
  - [findOneQuery](https://mikro-orm.io/api/core/class/EntityRepository#findOne) — 单条查询（可空）
  - [findOneOrFailQuery](https://mikro-orm.io/api/core/class/EntityRepository#findOneOrFail) — 单条查询（不存在则抛错）

查询的 `where` 参数会生成对应的 Filter 类型，支持 `eq`、`gt`、`gte`、`lt`、`lte`、`in`、`nin`、`ne` 等比较操作符。通过 **MikroWeaver.config** 的 `dialect` 选项可以控制是否暴露 PostgreSQL 专有操作符（如 `ilike`、`overlap`、`contains`），从而在 SQLite、MySQL 等数据库下避免生成不支持的 API。

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
    author: () => p.manyToOne(UserEntity).ref(),
  }),
})
export interface IPost extends InferEntity<typeof PostEntity> {}
export const Post = mikroSilk(PostEntity)
// @filename: provider.ts
import { createMemoization } from "@gqloom/core/context"
import { MikroORM } from "@mikro-orm/libsql"
import { Post, User } from "./entities"
export const orm = MikroORM.initSync({
  entities: [User, Post],
  dbName: ":memory:",
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

解析器工厂预置了常用的变更（内部通过 EntityManager 的对应方法实现）：
  - [createMutation](https://mikro-orm.io/api/core/class/EntityRepository#create) — 创建并持久化
  - [insertMutation](https://mikro-orm.io/api/core/class/EntityRepository#insert) — 原生插入
  - [insertManyMutation](https://mikro-orm.io/api/core/class/EntityRepository#insertMany) — 批量插入
  - [deleteMutation](https://mikro-orm.io/api/core/class/EntityRepository#nativeDelete) — 按条件删除
  - [updateMutation](https://mikro-orm.io/api/core/class/EntityRepository#nativeUpdate) — 按条件更新
  - [upsertMutation](https://mikro-orm.io/api/core/class/EntityRepository#upsert) — 存在则更新否则插入
  - [upsertManyMutation](https://mikro-orm.io/api/core/class/EntityRepository#upsertMany) — 批量 upsert

**说明**：工厂提供的 createMutation、insertMutation、insertManyMutation 等变更已内置在操作完成后调用 `em.flush()`，因此一般无需再单独包一层 flusher 中间件；手写 mutation 时才需要自行添加 flusher。

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
    author: () => p.manyToOne(UserEntity).ref(),
  }),
})
export interface IPost extends InferEntity<typeof PostEntity> {}
export const Post = mikroSilk(PostEntity)
// @filename: provider.ts
import { createMemoization } from "@gqloom/core/context"
import { MikroORM } from "@mikro-orm/libsql"
import { Post, User } from "./entities"
export const orm = MikroORM.initSync({
  entities: [User, Post],
  dbName: ":memory:",
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
import { User } from "./entities"
export const orm = MikroORM.initSync({
  entities: [User],
  dbName: ":memory:",
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
    author: () => p.manyToOne(UserEntity).ref(),
  }),
})
export const Post = mikroSilk(PostEntity)
// @filename: provider.ts
import { createMemoization } from "@gqloom/core/context"
import { MikroORM } from "@mikro-orm/libsql"
import { Post, User } from "./entities"
export const orm = MikroORM.initSync({
  entities: [User, Post],
  dbName: ":memory:",
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
    author: () => p.manyToOne(UserEntity).ref(),
  }),
})
export const Post = mikroSilk(PostEntity)
// @filename: provider.ts
import { createMemoization } from "@gqloom/core/context"
import { MikroORM } from "@mikro-orm/libsql"
import { Post, User } from "./entities"
export const orm = MikroORM.initSync({
  entities: [User, Post],
  dbName: ":memory:",
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

有两个用于创建 Resolver 的方法（示例中变量名为 `userResolverFactory`）：

- **`userResolverFactory.queriesResolver(name?)`**：创建一个只包含查询与关系字段的 Resolver。可选参数 `name` 用于生成字段名，例如传入 `"User"` 时会得到 `countUser`、`findUser`、`findUserByCursor`、`findOneUser`、`findOneUserOrFail` 以及实体上的关系字段（如 `posts`）。
- **`userResolverFactory.resolver(name?)`**：在查询与关系字段的基础上，再增加变更字段，如 `createUser`、`insertUser`、`insertManyUser`、`deleteUser`、`updateUser`、`upsertUser`、`upsertManyUser`。同样可通过 `name` 控制生成的字段名前缀。

## Weaver 配置与自定义类型映射

通过 **MikroWeaver.config** 可以统一配置织入行为，推荐在应用里只设置一次，并在编织 Schema 时传入 `weave`。支持的选项包括：

- **`presetGraphQLType(property)`**：为指定属性覆盖默认的 GraphQL 输出类型，用于扩展或替换默认类型映射。
- **`dialect`**：数据库方言（如 `"PostgreSQL"`、`"MySQL"`、`"SQLite"`、`"MongoDB"`）。用于控制 Filter 中是否暴露 PostgreSQL 专有操作符（如 `ilike`、`overlap`、`contains`）；不设置时按兼容 PostgreSQL 处理，设置成 SQLite/MySQL 等可避免生成不支持的 API。
- **`metadata`**：MikroORM 的 `MetadataStorage`，或返回它的函数（如 `() => orm.getMetadata()`）。**使用装饰器定义的类实体时必设**，这样织入与解析器工厂才能从类解析出实体元数据；使用 `defineEntity`（EntitySchema）时可省略。

下面示例中，我们使用 `presetGraphQLType` 将 `datetime` 类型映射到 [graphql-scalars](https://the-guild.dev/graphql/scalars) 的 `GraphQLDateTime`；若使用类实体，可同时传入 `metadata: orm.getMetadata()`。

```ts twoslash
import { MikroWeaver } from "@gqloom/mikro-orm"
import { GraphQLDateTime } from "graphql-scalars"

export const mikroWeaverConfig = MikroWeaver.config({
  presetGraphQLType: (property) => {
    if (property.type === "datetime") {
      return GraphQLDateTime
    }
  },
  // 使用类实体时取消注释：
  // metadata: orm.getMetadata(),
})
```

在编织 GraphQL Schema 时传入该配置：

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
