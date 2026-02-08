<script setup>
import { Tabs } from "@/components/tabs.tsx"
</script>

# MikroORM

[MikroORM](https://mikro-orm.io/) is a TypeScript ORM for Node.js that supports PostgreSQL, MySQL, MariaDB, SQLite, MongoDB, and more. It is based on the Data Mapper, Unit of Work, and Identity Map patterns, aiming to provide a powerful and easy-to-use database toolset.

`@gqloom/mikro-orm` provides integration between GQLoom and MikroORM:

- Use MikroORM Entities as [Silks](../silk);
- Use resolver factories to quickly generate CRUD operations from MikroORM.

## Installation

<!--@include: ../../snippets/install-mikro.md-->

## Using Silks

Wrap MikroORM Entities with `mikroSilk` to use them as [Silks](../silk). There are two ways to define entities:

<Tabs groupId="entity-definition">
<template #defineEntity>

When using `defineEntity` to define entities, wrap them with `mikroSilk`. Before using them in resolvers you need to initialize MikroORM; example below:

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
<template #Decorators and classes>

When using decorators to define entities, wrap the entity class with `mikroSilk`. Because class entities are resolved from MikroORM metadata, provide the metadata store via `MikroWeaver.config` when weaving.

::: warning Note
When using decorators, ensure you import `reflect-metadata` at the top of your app entry and install that dependency.
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

Now we can use them in resolvers:

### Manual Resolver

You can use MikroORM entities wrapped with `mikroSilk` directly in the resolver:

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

As shown in the code above, we can use MikroORM entities wrapped with `mikroSilk` directly in the resolver. Here we use `User` as the parent type for `resolver.of`, and define two queries `user` and `users`, plus a `createUser` mutation.

::: tip Key points
- **Entity Manager**: Use `useEm()` to get the request-scoped Entity Manager for database operations.
- **Auto persist**: Use the `flusher` middleware to call `em.flush()` after a successful mutation.
- **Performance**: Use `useSelectedFields()` so only the columns requested in the GraphQL query are selected; this function requires [enabling context](../context).
:::

### Derived Fields

Add derived fields to database entities:

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
::: tip Note
Derived fields must use `derivedFrom` to declare the columns they depend on, so that `useSelectedFields` can select them correctly.
:::

### Hiding Fields

`@gqloom/mikro-orm` exposes all fields by default. To hide sensitive fields (e.g. password), use `field.hidden`:

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

With `password: field.hidden`, that field will not appear in the generated GraphQL schema.

### Mixing Fields

For fields such as `json` or `enum`, to get consistent type inference in both TypeScript and GraphQL you can use `valibot` or `zod`:

<Tabs groupId="schema-library">
<template #Valibot>

<<< @/snippets/code/mikro-valibot.ts{ts twoslash}

</template>
<template #Zod>

<<< @/snippets/code/mikro-zod.ts{ts twoslash}

</template>
</Tabs>

## Resolver Factory

Besides manual resolvers, `@gqloom/mikro-orm` provides `MikroResolverFactory`. It greatly reduces boilerplate and quickly generates common queries, mutations, and relation fields from entity metadata.

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

The `MikroResolverFactory` constructor supports two forms:
1. `new MikroResolverFactory(Entity, getEntityManager)`: pass the entity and a function that returns an `EntityManager`.
2. `new MikroResolverFactory(Entity, options)`: pass the entity and an options object `{ getEntityManager, input? }`.

::: info Note
The **`input`** option configures each field’s visibility and validation in filter / create / update.
:::

### Relation Fields

The resolver factory provides `referenceField` and `collectionField` to define relation fields:

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

In the code above we use `userResolverFactory.collectionField('posts')` and `postResolverFactory.referenceField('author')` to define relation fields. `collectionField` is for `one-to-many` and `many-to-many` relations; `referenceField` is for `many-to-one` and `one-to-one` relations.

### Queries

The resolver factory provides preset query methods that call the corresponding `EntityManager` methods:
  - [countQuery](https://mikro-orm.io/api/core/class/EntityRepository#count) — count
  - [findQuery](https://mikro-orm.io/api/core/class/EntityRepository#find) — list query
  - [findAndCountQuery](https://mikro-orm.io/api/core/class/EntityRepository#findAndCount) — list + total
  - [findByCursorQuery](https://mikro-orm.io/api/core/class/EntityRepository#findByCursor) — cursor pagination
  - [findOneQuery](https://mikro-orm.io/api/core/class/EntityRepository#findOne) — single query (nullable)
  - [findOneOrFailQuery](https://mikro-orm.io/api/core/class/EntityRepository#findOneOrFail) — single query (throws if not found)

The `where` argument generates a Filter type. The `dialect` option in `MikroWeaver.config` controls whether PostgreSQL-only operators (e.g. `ilike`, `overlap`) are exposed, so you get a compatible API across databases.

You can use them directly:

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

In the code above we use `userResolverFactory.findOneQuery()` to define the `user` query. The resolver factory will automatically create the input type and resolver function.

### Mutations

The resolver factory provides preset mutation methods:
  - [createMutation](https://mikro-orm.io/api/core/class/EntityRepository#create) — create and persist
  - [insertMutation](https://mikro-orm.io/api/core/class/EntityRepository#insert) — native insert
  - [insertManyMutation](https://mikro-orm.io/api/core/class/EntityRepository#insertMany) — batch insert
  - [deleteMutation](https://mikro-orm.io/api/core/class/EntityRepository#nativeDelete) — delete by condition
  - [updateMutation](https://mikro-orm.io/api/core/class/EntityRepository#nativeUpdate) — update by condition
  - [upsertMutation](https://mikro-orm.io/api/core/class/EntityRepository#upsert) — upsert (update or insert)
  - [upsertManyMutation](https://mikro-orm.io/api/core/class/EntityRepository#upsertMany) — batch upsert

::: tip Built-in persist
The factory’s mutation methods already call `em.flush()`; you usually do not need to add a flusher middleware manually.
:::

You can use them directly:

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

In the code above we use `postResolverFactory.createMutation()` to define the `createPost` mutation. The factory will automatically create the input type and resolver function.

### Custom Input Fields

Via the `input` option in the constructor, you can configure each field’s validation and visibility per operation:

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
    email: v.pipe(v.string(), v.email()), // Validate email format [!code hl]
    password: {
      filters: field.hidden, // Hide this field in query filters [!code hl]
      create: v.pipe(v.string(), v.minLength(6)), // Validate min length 6 on create [!code hl]
      update: v.pipe(v.string(), v.minLength(6)), // Validate min length 6 on update [!code hl]
    },
  },
})
```

### Custom Input Object

To specify the full input type (including transform) for a given query or mutation, use the `.input()` method:

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

The example above transforms the input into MikroORM query parameters.

### Adding Middleware

Preset queries, mutations, and fields all support the `use` method for middleware such as auth or logging:

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

In the code above we use the `use` method to add middleware. `useAuthedUser()` is a custom function to get the current user; if not logged in it throws, otherwise it calls `next()` to continue.

### Complete Resolver

You can generate a resolver that includes all preset operations directly from the factory:

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

`MikroResolverFactory` provides two methods to generate a Resolver:

- **`queriesResolver(name?)`**: Creates a resolver that only contains queries and relation fields.
- **`resolver(name?)`**: Adds mutation fields (e.g. `createUser`, `updateUser`) on top of queries and relation fields.

::: info Note
The optional `name` argument controls the field name prefix. For example, passing `"User"` yields `findOneUser`, `createUser`, etc.
:::

## Weaver Config and Custom Type Mapping

Configure weaving behavior via `MikroWeaver.config`. Set it once in your app and pass it into `weave`:

- **`presetGraphQLType(property)`**: Override the default type mapping.
- **`dialect`**: Set the database dialect (e.g. `"PostgreSQL"`, `"MySQL"`, `"SQLite"`, `"MongoDB"`) to narrow Filter operators.

Example: map `datetime` to `GraphQLDateTime`.

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

Pass this config when weaving the GraphQL schema:

```ts
export const schema = weave(mikroWeaverConfig, userResolver, postResolver)
```

## Default Type Mapping

GQLoom maps MikroORM property types to GraphQL types by default:

| MikroORM Type | GraphQL Type     |
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
