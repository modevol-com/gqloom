# MikroORM

[MikroORM](https://mikro-orm.io/) is a TypeScript ORM for Node.js that supports multiple databases such as PostgreSQL, MySQL, MariaDB, SQLite, and MongoDB. It is based on the Data Mapper, Unit of Work, and Identity Map patterns, aiming to provide a powerful and easy-to-use database toolset.

`@gqloom/mikro-orm` provides integration between GQLoom and MikroORM:

- Use MikroORM Entities as [Silks](../silk);
- Use resolver factories to quickly generate CRUD operations from MikroORM.

## Installation

Please refer to MikroORM's [Getting Started guide](https://mikro-orm.io/docs/installation) to install MikroORM and the corresponding database drivers.

After installing MikroORM, install `@gqloom/mikro-orm`:

::: code-group
```sh [npm]
npm i @gqloom/core @gqloom/mikro-orm
```
```sh [pnpm]
pnpm add @gqloom/core @gqloom/mikro-orm
```
```sh [yarn]
yarn add @gqloom/core @gqloom/mikro-orm
```
```sh [bun]
bun add @gqloom/core @gqloom/mikro-orm
```
:::

## Using Silks

By simply wrapping MikroORM Entities with `mikroSilk`, we can easily use them as [Silks](../silk).

```ts twoslash title="entities.ts"
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
import { createMemoization } from "@gqloom/core/context"
import { MikroORM } from "@mikro-orm/libsql"
import { Post, User } from "./entities"

export let orm: MikroORM

export const ormPromise = MikroORM.init({
  entities: [User, Post],
  dbName: ":memory:",
  debug: true,
}).then(async (o: MikroORM) => {
  orm = o
  await orm.getSchemaGenerator().updateSchema()
})

export const useEm = createMemoization(() => orm.em.fork())

export const flusher: Middleware = async (next) => {
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
export const flusher: Middleware = async (next) => {
  const result = await next()
  await useEm().flush()
  return result
}
// @filename: index.ts
// ---cut---
import { field, mutation, query, resolver } from "@gqloom/core"
import * as v from "valibot"
import { Post, User } from "./entities"
import { flusher, useEm } from "./provider"

export const userResolver = resolver.of(User, {
  user: query(User.nullable())
    .input({ id: v.number() })
    .resolve(({ id }) => {
      return useEm().findOne(User, { id })
    }),

  users: query(User.list()).resolve(() => {
    return useEm().findAll(User, {})
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

  posts: field(Post.list()).resolve((user) => {
    return useEm().find(Post, { author: user.id })
  }),
})
```

As shown in the code above, we can directly use MikroORM entities wrapped with `mikroSilk` in the `resolver`. Here, we use `User` as the parent type for `resolver.of`, and define two queries, `user` and `users`, as well as a `createUser` mutation.

All database operations are performed through the request-scoped Entity Manager obtained via `useEm()`. For mutation operations, we use a `flusher` middleware that automatically calls `em.flush()` to persist changes to the database after a successful mutation.

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
import { field, resolver } from "@gqloom/core"
import * as v from "valibot"
import { User, type IUser } from "./entities"

export const userResolver = resolver.of(User, {
  fullName: field(v.string()).resolve((user: IUser) => {
    return `Mr/Ms ${user.name}`
  }),
})
```

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

In the code above, we created resolver factories for the `User` and `Post` models. `MikroResolverFactory` accepts two arguments: the first is the entity as a silk, and the second is a function that returns an `EntityManager` instance.

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

The resolver factory comes with preset common queries:
  - `countQuery`
  - `findQuery`
  - `findAndCountQuery`
  - `findByCursorQuery`
  - `findOneQuery`
  - `findOneOrFailQuery`

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

The resolver factory comes with preset common mutations:
  - `createMutation`
  - `insertMutation`
  - `insertManyMutation`
  - `deleteMutation`
  - `updateMutation`
  - `upsertMutation`
  - `upsertManyMutation`

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

### Custom Input

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
  user: userResolverFactory.findOneQuery({
    input: v.pipe(
      v.object({ id: v.number() }),
      v.transform(({ id }) => ({ where: { id } }))
    )
  }),
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

// Readonly Resolver
const userQueriesResolver = userResolverFactory.queriesResolver()

// Full Resolver
const userResolver = userResolverFactory.resolver()
```

There are two functions for creating a Resolver:

- `usersResolverFactory.queriesResolver()`: Creates a Resolver containing only queries and relation fields.
- `usersResolverFactory.resolver()`: Creates a complete Resolver containing all queries, mutations, and relation fields.

## Custom Type Mapping

To accommodate more MikroORM types, we can extend GQLoom to add more type mappings.

First, we use `MikroWeaver.config` to define the type mapping configuration. Here we import `GraphQLDateTime` from [graphql-scalars](https://the-guild.dev/graphql/scalars), and when we encounter a `datetime` type, we map it to the corresponding GraphQL scalar.

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

Pass the configuration to the weave function when weaving the GraphQL Schema:

```ts twoslash
// @filename: config.ts
import { MikroWeaver } from "@gqloom/mikro-orm"
import { GraphQLDateTime } from "graphql-scalars"

export const mikroWeaverConfig = MikroWeaver.config({
  presetGraphQLType: (property) => {
    if (property.type === "datetime") {
      return GraphQLDateTime
    }
  },
})
// @filename: index.ts
import { weave } from "@gqloom/core"
import { mikroWeaverConfig } from "./config"
// @ts-expect-error
import { userResolver, postResolver } from "./resolver"

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