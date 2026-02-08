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

使用装饰器定义实体时，只需用 `mikroSilk` 包裹实体类。由于类实体需要从 MikroORM 的元数据中解析，在织入时需通过 `MikroWeaver.config` 提供元数据存储。

::: warning 注意
使用装饰器时，请确保在应用入口顶部导入 `reflect-metadata` 并安装该依赖。
:::

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

### 手写解析器

你可以直接在 `resolver` 里使用 `mikroSilk` 包裹的 MikroORM 实体：

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

::: tip 关键要点
- **Entity Manager**：通过 `useEm()` 获取请求作用域的 Entity Manager 执行数据库操作。
- **自动持久化**：使用 `flusher` 中间件，在变更操作成功后自动调用 `em.flush()`。
- **性能优化**：通过 `useSelectedFields()` 确保只选择 GraphQL 查询中请求的列，此函数需要[启用上下文](../context)。
:::

### 派生字段

为数据库实体添加派生字段：

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
::: tip 提示
派生字段需要使用 `derivedFrom` 声明所依赖的列，以便 `useSelectedFields` 能正确选取。
:::

### 隐藏字段

`@gqloom/mikro-orm` 默认将暴露所有字段。若需隐藏敏感字段（如密码），可使用 `field.hidden`：

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

设置 `password: field.hidden` 后，该字段将不会出现在生成的 GraphQL Schema 中。

### 混合字段

对 `json`、`enum` 等字段，若要在 TypeScript 与 GraphQL 中一致地推导出类型，可借助 `valibot` 或 `zod`：

<Tabs groupId="schema-library">
<template #Valibot>

<<< @/snippets/code/mikro-valibot.ts{ts twoslash}

</template>
<template #Zod>

<<< @/snippets/code/mikro-zod.ts{ts twoslash}

</template>
</Tabs>

## 解析器工厂

除了手写解析器，`@gqloom/mikro-orm` 还提供了 `MikroResolverFactory`。它能大大减少样板代码，根据实体元数据快速生成常用的查询、变更和关系字段。

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

`MikroResolverFactory` 的构造函数支持两种用法：
1. `new MikroResolverFactory(Entity, getEntityManager)`：传入实体和获取 `EntityManager` 的函数。
2. `new MikroResolverFactory(Entity, options)`：传入实体和配置对象 `{ getEntityManager, input? }`。

::: info 说明
**`input`** 选项用于配置各字段在 filter / create / update 中的可见性与校验。
:::

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

解析器工厂预置了常用的查询方法，它们在内部调用 `EntityManager` 的对应方法：
  - [countQuery](https://mikro-orm.io/api/core/class/EntityRepository#count) — 计数
  - [findQuery](https://mikro-orm.io/api/core/class/EntityRepository#find) — 列表查询
  - [findAndCountQuery](https://mikro-orm.io/api/core/class/EntityRepository#findAndCount) — 列表 + 总数
  - [findByCursorQuery](https://mikro-orm.io/api/core/class/EntityRepository#findByCursor) — 游标分页
  - [findOneQuery](https://mikro-orm.io/api/core/class/EntityRepository#findOne) — 单条查询（可空）
  - [findOneOrFailQuery](https://mikro-orm.io/api/core/class/EntityRepository#findOneOrFail) — 单条查询（不存在则抛错）

查询的 `where` 参数会生成对应的 Filter 类型。通过 `MikroWeaver.config` 的 `dialect` 选项可以控制是否暴露 PostgreSQL 专有操作符（如 `ilike`、`overlap`），从而在不同数据库下生成兼容的 API。

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

解析器工厂预置了常用的变更方法：
  - [createMutation](https://mikro-orm.io/api/core/class/EntityRepository#create) — 创建并持久化
  - [insertMutation](https://mikro-orm.io/api/core/class/EntityRepository#insert) — 原生插入
  - [insertManyMutation](https://mikro-orm.io/api/core/class/EntityRepository#insertMany) — 批量插入
  - [deleteMutation](https://mikro-orm.io/api/core/class/EntityRepository#nativeDelete) — 按条件删除
  - [updateMutation](https://mikro-orm.io/api/core/class/EntityRepository#nativeUpdate) — 按条件更新
  - [upsertMutation](https://mikro-orm.io/api/core/class/EntityRepository#upsert) — 存在则更新否则插入
  - [upsertManyMutation](https://mikro-orm.io/api/core/class/EntityRepository#upsertMany) — 批量 upsert

::: tip 内置持久化
工厂提供的变更方法已内置 `em.flush()`，通常无需手动添加 `flusher` 中间件。
:::

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

通过构造函数中的 `input` 选项，可以精确配置每个字段在不同操作下的验证与展示行为：

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

若需为特定的查询或变更指定完整的输入类型（包括转换逻辑），可使用 `.input()` 方法：

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

以上示例将输入参数手动转换为 MikroORM 的查询参数。

### 添加中间件

预置的查询、变更和字段均支持 `use` 方法，以便添加鉴权或日志等中间件：

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

你可以直接从解析器工厂生成包含所有预置操作的解析器：

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

`MikroResolverFactory` 提供了两个核心方法来生成 Resolver：

- **`queriesResolver(name?)`**：创建一个仅包含查询与关系字段的解析器。
- **`resolver(name?)`**：在查询与关系字段的基础上，增加变更字段（如 `createUser`、`updateUser` 等）。

::: info 提示
可选参数 `name` 用于控制字段名前缀。例如传入 `"User"` 会生成 `findOneUser`、`createUser` 等字段。
:::

## Weaver 配置与自定义类型映射

通过 `MikroWeaver.config` 统一配置织入行为。推荐在应用中全局设置一次，并在织入 Schema 时传入：

- **`presetGraphQLType(property)`**：覆盖默认的类型映射。
- **`dialect`**：设置数据库方言（如 `"PostgreSQL"`, `"MySQL"`, `"SQLite"`, `"MongoDB"`），用于精简 Filter 中的操作符。

示例：将 `datetime` 映射为 `GraphQLDateTime`。

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

织入 GraphQL Schema 时传入该配置：

```ts
export const schema = weave(mikroWeaverConfig, userResolver, postResolver)
```

## 默认类型映射

GQLoom 默认将 MikroORM 属性映射到对应的 GraphQL 类型：

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
