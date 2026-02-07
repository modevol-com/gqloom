<script setup>
import { Tabs } from "@/components/tabs.tsx"
</script>

# MikroORM

[MikroORM](https://mikro-orm.io/) is a TypeScript ORM for Node.js that supports multiple databases such as PostgreSQL, MySQL, MariaDB, SQLite, and MongoDB. It is based on the Data Mapper, Unit of Work, and Identity Map patterns, aiming to provide a powerful and easy-to-use database toolset.

`@gqloom/mikro-orm` provides integration between GQLoom and MikroORM:

- Use MikroORM Entities as [Silks](../silk);
- Use resolver factories to quickly generate CRUD operations from MikroORM.

## Installation

<!--@include: ../../snippets/install-mikro.md-->

## Using Silks

By simply wrapping MikroORM Entities with `mikroSilk`, we can easily use them as [Silks](../silk).

::: code-group

```ts twoslash [Using Silk]
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

```ts twoslash [Full File]
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

The second argument of `mikroSilk(Entity, config?)` is optional and is used to set the GraphQL type description (`description`), override or hide fields (`fields`), etc. See the `MikroSilkConfig` type for details.

### Using decorator-defined entities

Besides `defineEntity`, you can define entities with MikroORM **decorators and classes** (`@Entity()`, `@Property()`, `@PrimaryKey()`, `@ManyToOne()`, `@OneToMany()`, etc.). When using class entities, you must provide `metadata` via **MikroWeaver.config** so that schema weaving and the resolver factory can resolve class names to metadata.

1. At the very top of your app entry, `import "reflect-metadata"` and add the `reflect-metadata` dependency.
2. After initializing the ORM, call `MikroWeaver.config({ metadata: orm.getMetadata() })` to get the weaver config (getter form `metadata: () => orm.getMetadata()` is also supported).
3. Pass this config as the first argument to `weave` when weaving the schema. If you call `getGraphQLType(silk)` or `factory.queriesResolver()` / `resolver()` outside of `weave`, run them inside the **same weaver context** (e.g. `initWeaverContext()`, `ctx.setConfig(weaverConfig)`, then wrap those calls with `provideWeaverContext(callback, ctx)`).

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

// After initializing the ORM
const weaverConfig = MikroWeaver.config({ metadata: orm.getMetadata() })
const AuthorSilk = mikroSilk(Author)
const BookSilk = mikroSilk(Book)

// Pass weaverConfig when weaving the schema
const schema = weave(weaverConfig, resolver({ author: query(AuthorSilk, ...), book: query(BookSilk, ...) }))
```

When using the resolver factory, build the resolver inside a **weaver context that has the config set** (so the factory can resolve class entities via `getWeaverConfigMetadata()`), for example:

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

Before using them in resolvers, we need to initialize MikroORM and provide a request-scoped Entity Manager.

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

Now we can use them in resolvers:

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

As shown in the code above, we can directly use MikroORM entities wrapped with `mikroSilk` in the `resolver`. Here, we use `User` as the parent type for `resolver.of`, and define two queries, `user` and `users`, as well as a `createUser` mutation.

All database operations are performed through the request-scoped Entity Manager obtained via `useEm()`.   
For mutation operations, we use a `flusher` middleware that automatically calls `em.flush()` to persist changes to the database after a successful mutation.  
We also use the `useSelectedFields()` function to ensure that only the fields requested in the GraphQL query are selected, which helps optimize database query performance. This function requires [enabling context](../context).

### Derived Fields

Adding derived fields to database entities is very simple:

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
Note: Derived fields need to use the `derivedFrom` method to declare the dependent columns, so that the `useSelectedFields` method can correctly select the required columns.

### Hiding Fields

`@gqloom/mikro-orm` exposes all fields by default. If you want to hide certain fields, such as a password, you can use `field.hidden`:

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

In the code above, we hide the `password` field, which means it will not appear in the generated GraphQL Schema.

### Mixing Fields

Sometimes we use `json`, `enum` fields in database entities, and we want to correctly infer the types in both TypeScript and GraphQL. We can use libraries like `valibot` or `zod` to define these fields:

<Tabs groupId="schema-library">
<template #Valibot>

<<< @/snippets/code/mikro-valibot.ts{ts twoslash}

</template>
<template #Zod>

<<< @/snippets/code/mikro-zod.ts{ts twoslash}

</template>
</Tabs>

## Resolver Factory

`@gqloom/mikro-orm` provides `MikroResolverFactory` to help you create resolver factories.
With resolver factories, you can quickly define common queries, mutations, and fields. The resolver factory also provides preset input types for common operations, which can greatly reduce boilerplate code and is very useful for rapid development.

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

In the code above, we created resolver factories for the `User` and `Post` models. The `MikroResolverFactory` constructor can be used in two ways:

- **Shorthand**: `new MikroResolverFactory(Entity, getEntityManager)`, where `getEntityManager` is `(payload?) => EntityManager | Promise<EntityManager>`.
- **Full options**: `new MikroResolverFactory(Entity, { getEntityManager, input?, metadata? })`. Use `input` to configure visibility and validation per field for filter/create/update. The `metadata` option is only needed for **decorator (class) entities** and is **deprecated**; prefer setting it once via **MikroWeaver.config({ metadata: orm.getMetadata() })**, pass that config into `weave` when weaving the schema, and wrap resolver construction in `provideWeaverContext` when needed.

### Relation Fields

The resolver factory provides `referenceField` and `collectionField` methods to define relation fields:

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

In the code above, we use `userResolverFactory.collectionField('posts')` and `postResolverFactory.referenceField('author')` to define relation fields. `collectionField` is used for `one-to-many` and `many-to-many` relations, while `referenceField` is used for `many-to-one` and `one-to-one` relations.

### Queries

The resolver factory comes with preset common queries (implemented via EntityManager’s `em.count()`, `em.find()`, etc.):
  - [countQuery](https://mikro-orm.io/api/core/class/EntityManager#count)
  - [findQuery](https://mikro-orm.io/api/core/class/EntityManager#find)
  - [findAndCountQuery](https://mikro-orm.io/api/core/class/EntityManager#findAndCount)
  - [findByCursorQuery](https://mikro-orm.io/api/core/class/EntityManager#findByCursor)
  - [findOneQuery](https://mikro-orm.io/api/core/class/EntityManager#findOne)
  - [findOneOrFailQuery](https://mikro-orm.io/api/core/class/EntityManager#findOneOrFail)

The `where` argument of queries is exposed as a **Filter** type with comparison operators such as `eq`, `gt`, `gte`, `lt`, `lte`, `in`, `nin`, `ne`. You can control whether PostgreSQL-only operators (e.g. `ilike`, `overlap`, `contains`) are included via **MikroWeaver.config**’s **dialect**, so that SQLite/MySQL do not get unsupported API.

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

In the code above, we use `userResolverFactory.findOneQuery()` to define the `user` query. The resolver factory will automatically create the input type and resolver function.

### Mutations

The resolver factory comes with preset common mutations (implemented via EntityManager’s `em.create()`, `em.nativeUpdate()`, etc.):
  - [createMutation](https://mikro-orm.io/api/core/class/EntityManager#create)
  - [insertMutation](https://mikro-orm.io/api/core/class/EntityManager#insert)
  - [insertManyMutation](https://mikro-orm.io/api/core/class/EntityManager#insertMany)
  - [deleteMutation](https://mikro-orm.io/api/core/class/EntityManager#nativeDelete)
  - [updateMutation](https://mikro-orm.io/api/core/class/EntityManager#nativeUpdate)
  - [upsertMutation](https://mikro-orm.io/api/core/class/EntityManager#upsert)
  - [upsertManyMutation](https://mikro-orm.io/api/core/class/EntityManager#upsertMany)

**Note:** `createMutation`, `insertMutation`, `insertManyMutation`, etc. already call `em.flush()` after the mutation, so you usually do not need to wrap them in a flusher middleware.

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

In the code above, we use `postResolverFactory.createMutation()` to define the `createPost` mutation. The factory will automatically create the input type and resolver function.

### Custom Input Fields

The default preset inputs of the resolver factory are configurable. By passing the `input` option during the construction of `MikroResolverFactory`, you can configure the input validation and display behavior for each field:

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
    email: v.pipe(v.string(), v.email()), // Validate email format [!code hl]
    password: {
      filters: false, // Hide this field in query filters [!code hl]
      create: v.pipe(v.string(), v.minLength(6)), // Validate minimum length of 6 on creation [!code hl]
      update: v.pipe(v.string(), v.minLength(6)), // Validate minimum length of 6 on update [!code hl]
    },
  },
})
```

### Custom Input Object

The preset queries and mutations in the resolver factory support custom inputs. You can define the input type through the `input` option:

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

In the code above, we use `valibot` to define the input type. `v.object({ id: v.number() })` defines the type of the input object, and `v.transform(({ id }) => ({ where: { id } }))` transforms the input argument into MikroORM's query parameters.

### Adding Middleware

The preset queries, mutations, and fields in the resolver factory support adding middleware. You can add middleware using the `use` method:

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

In the code above, we use the `use` method to add a middleware. `useAuthedUser()` is a custom function to get the currently logged-in user. If the user is not logged in, it throws an error; otherwise, it calls `next()` to proceed.

### Complete Resolver 

You can create a complete Resolver directly from the resolver factory:

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

// Readonly Resolver (queries + relation fields only)
const userQueriesResolver = userResolverFactory.queriesResolver()

// Full Resolver (queries + mutations + relation fields)
const userResolver = userResolverFactory.resolver()
```

There are two methods for creating a Resolver:

- **`userResolverFactory.queriesResolver(name?)`**: Creates a Resolver with only queries and relation fields. The optional `name` argument is used to generate field names (if omitted, the entity’s name/className is used).
- **`userResolverFactory.resolver(name?)`**: Creates a full Resolver with all queries, mutations, and relation fields.

Generated field naming (for `name = "User"`): queries include `countUser`, `findUser`, `findUserByCursor`, `findOneUser`, `findOneUserOrFail`; mutations include `createUser`, `insertUser`, `insertManyUser`, `deleteUser`, `updateUser`, `upsertUser`, `upsertManyUser`; relation properties on the entity (e.g. `posts`, `author`) are exposed as-is. The factory uses MikroORM **EntityManager** methods (e.g. `em.count()`, `em.find()`) to implement these operations.

## Weaver config (MikroWeaver.config)

`MikroWeaver.config(options)` is used to configure behavior when weaving the schema. Create it once in your app and pass it as the first argument to `weave`.

### Config options

| Option | Type | Description |
|--------|------|-------------|
| **presetGraphQLType** | `(property) => GraphQLOutputType \| undefined` | Override the default GraphQL output type for a property (see “Custom type mapping” below). |
| **dialect** | `"PostgreSQL"` \| `"MySQL"` \| `"SQLite"` \| `"MongoDB"` etc. \| `null` | Database dialect. Controls whether Filter exposes PostgreSQL-only operators (e.g. `ilike`, `overlap`, `contains`). Set to SQLite/MySQL etc. to avoid unsupported comparison operators. If unset, defaults to PostgreSQL-friendly behavior. |
| **metadata** | `MetadataStorage \| (() => MetadataStorage)` | MikroORM metadata storage. **Required when using decorator (class) entities**; recommend `metadata: orm.getMetadata()` or `metadata: () => orm.getMetadata()`. Can be omitted when using `defineEntity` (EntitySchema). |

### Custom type mapping

To support more MikroORM types, set `presetGraphQLType` in `MikroWeaver.config`. For example, use [graphql-scalars](https://the-guild.dev/graphql/scalars) `GraphQLDateTime` to map `datetime` to the corresponding GraphQL scalar (a more robust approach is `Object.is(property.type, DateTimeType)`; import `DateTimeType` from `@mikro-orm/core`):

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

Pass the config when weaving the GraphQL schema:

```ts
export const schema = weave(mikroWeaverConfig, userResolver, postResolver)
```

## Default Type Mapping

The following table lists the default mapping between MikroORM types and GraphQL types in GQLoom:

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