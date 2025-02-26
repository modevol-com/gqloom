---
title: Prisma
---

# Prisma

[Prisma ORM](https://www.prisma.io/orm) offers developers a brand - new experience when working with databases, thanks to its intuitive data models, automatic migrations, type safety, and auto - completion features.

`@gqloom/prisma` provides the integration of GQLoom and Prisma:

- Generate [silk](../silk) from Prisma Schema.
- Use the resolver factory to quickly create CRUD operations from Prisma.

## Installation

::: code-group
```sh [npm]
npm i -D prisma
npm i @gqloom/core @gqloom/prisma
```
```sh [pnpm]
pnpm add -D prisma
pnpm add @gqloom/core @gqloom/prisma
```
```sh [yarn]
yarn add -D prisma
yarn add @gqloom/core @gqloom/prisma
```
```sh [bun]
bun add -D prisma
bun add @gqloom/core @gqloom/prisma
```
:::

You can find more information about installation in the [Prisma documentation](https://www.prisma.io/docs/getting-started/quickstart).

## Configuration

Define your Prisma Schema in the `prisma/schema.prisma` file:

```prisma
generator client {
  provider = "prisma-client-js"
}

generator gqloom { // [!code hl]
  provider = "prisma-gqloom" // [!code hl]
} // [!code hl]

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  posts Post[]
}

model Post {
  id        Int     @id @default(autoincrement())
  title     String
  content   String?
  published Boolean @default(false)
  author    User    @relation(fields: [authorId], references: [id])
  authorId  Int
}
```

### Generator Parameters
The `generator` accepts the following parameters:

| Parameter      | Description                                                                                                                | Default Value                           |
| -------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `gqloomPath`   | The path to the GQLoom package.                                                                                            | `@gqloom/prisma`                        |
| `clientOutput` | The path to the Prisma client.                                                                                             | `node_modules/@prisma/client`           |
| `output`       | The folder path where the generated files will be located.                                                                 | `node_modules/@gqloom/prisma/generated` |
| `commonjsFile` | The file name of the CommonJS file. Use an empty string `""` to skip generation of the CommonJS file.                      | `index.cjs`                             |
| `moduleFile`   | The file name of the ES module file. Use an empty string `""` to skip generation of the ES module file.                    | `index.js`                              |
| `typesFiles`   | The file name(s) of the TypeScript declaration file(s). Use `[]` to skip generation of the TypeScript declaration file(s). | `["index.d.ts"]`                        |

### Generate Silk
```sh
npx prisma generate
```

## Using Silk
After generating the silk, we can use it in the `resolver`:
```ts
import { resolver, query, field, weave } from '@gqloom/core'
import { ValibotWeaver } from '@gqloom/valibot'
import { Post, User } from '@gqloom/prisma/generated'
import * as v from 'valibot'
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient({})

const userResolver = resolver.of(User, {
  user: query(User.nullable(), {
    input: { id: v.number() },
    resolve: ({ id }) => {
      return db.user.findUnique({ where: { id } })
    },
  }),

  posts: field(Post.list(), async (user) => {
    const posts = await db.user.findUnique({ where: { id: user.id } }).posts()
    return posts ?? []
  }),
})

const postResolver = resolver.of(Post, {
  author: field(User, async (post) => {
    const author = await db.post.findUnique({ where: { id: post.id } }).author()
    return author!
  }),
})

export const schema = weave(ValibotWeaver, userResolver, postResolver)
```

### Hiding Fields
`@gqloom/prisma` exposes all fields by default. If you want to hide certain fields, you can use `field.hidden`:

```ts
const postResolver = resolver.of(Post, {
  author: field(User, async (post) => {
    const author = await db.post.findUnique({ where: { id: post.id } }).author()
    return author!
  }),

  authorId: field.hidden, // [!code hl]
})
```

In the above code, we hide the `authorId` field, which means it will not appear in the generated GraphQL Schema.

## Resolver Factory

`@gqloom/prisma` provides the `PrismaResolverFactory` to help you create resolver factories.
With the resolver factory, you can quickly define common queries, mutations, and fields. The resolver factory also pre - defines the input types for common operation inputs. Using the resolver factory can significantly reduce boilerplate code, which is very useful for rapid development.

```ts
import { Post, User } from '@gqloom/prisma/generated'
import { PrismaResolverFactory } from '@gqloom/prisma'

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient({})

const userResolverFactory = new PrismaResolverFactory(User, db)
const postResolverFactory = new PrismaResolverFactory(Post, db)
```
In the above code, we create resolver factories for the `User` and `Post` models. The `PrismaResolverFactory` accepts two parameters. The first is the model used as silk, and the second is an instance of `PrismaClient`.

### Relationship Fields

The resolver factory provides the `relationField` method to define relationship fields:

```ts
const userResolver = resolver.of(User, {
  user: query(User.nullable(), {
    input: { id: v.number() },
    resolve: ({ id }) => {
      return db.user.findUnique({ where: { id } })
    },
  }),

  posts: field(Post.list(), async (user) => { // [!code --]
    const posts = await db.user.findUnique({ where: { id: user.id } }).posts() // [!code --]
    return posts ?? [] // [!code --]
  }), // [!code --]
  posts: userResolverFactory.relationField('posts'), // [!code ++]
})

const postResolver = resolver.of(Post, {
  author: field(User, async (post) => { // [!code --]
    const author = await db.post.findUnique({ where: { id: post.id } }).author() // [!code --]
    return author! // [!code --]
  }), // [!code --]
  author: postResolverFactory.relationField('author'), // [!code ++]

  authorId: field.hidden,
})
```
In the above code, we use `userResolverFactory.relationField('posts')` and `postResolverFactory.relationField('author')` to define relationship fields.
The `relationField` method accepts a string parameter representing the name of the relationship field.

### Queries

The resolver factory pre - defines common queries:
  - countQuery
  - findFirstQuery
  - findManyQuery
  - findUniqueQuery

You can use them directly:

```ts
const userResolver = resolver.of(User, {
  user: query(User.nullable(), { // [!code --]
    input: { id: v.number() }, // [!code --]
    resolve: ({ id }) => { // [!code --]
      return db.user.findUnique({ where: { id } }) // [!code --]
    }, // [!code --]
  }), // [!code --]
  user: userResolverFactory.findUniqueQuery(), // [!code ++]

  posts: userResolverFactory.relationField('posts'),
})
```

In the above code, we use `userResolverFactory.findUniqueQuery()` to define the `user` query. The resolver factory will automatically create the input type and the resolver function.

### Mutations

The resolver factory pre - defines common mutations:
  - createMutation
  - createManyMutation
  - deleteMutation
  - deleteManyMutation
  - updateMutation
  - updateManyMutation
  - upsertMutation

You can use them directly:

```ts
const postResolver = resolver.of(Post, {
  createPost: postResolverFactory.createMutation(), // [!code hl]

  author: postResolverFactory.relationField('author'),

  authorId: field.hidden,
})
```

In the above code, we use `postResolverFactory.createMutation()` to define the `createPost` mutation. The factory will automatically create the input type and the resolver function.

### Custom Input

The pre-defined queries and mutations of the resolver factory support custom input. You can define the input type through the `input` option:

```ts
import * as v from 'valibot'

const userResolver = resolver.of(User, {
  user: userResolverFactory.findUniqueQuery({
    input: v.pipe( // [!code hl]
      v.object({ id: v.number() }), // [!code hl]
      v.transform(({ id }) => ({ where: { id } })) // [!code hl]
    ), // [!code hl]
  }),

  posts: userResolverFactory.relationField("posts"),
})
```

In the above code, we use `valibot` to define the input type. `v.object({ id: v.number() })` defines the type of the input object, and `v.transform(({ id }) => ({ where: { id } }))` converts the input parameters into Prisma query parameters.

### Adding Middleware

The pre-defined queries, mutations, and fields of the resolver factory support adding middleware. You can define middleware through the `middlewares` option:

```ts
const postResolver = resolver.of(Post, {
  createPost: postResolverFactory.createMutation({
    middlewares: [ // [!code hl]
      async (next) => { // [!code hl]
        const user = await useAuthedUser() // [!code hl]
        if (user == null) throw new GraphQLError('Please login first') // [!code hl]
        return next() // [!code hl]
      }, // [!code hl]
    ], // [!code hl]
  }),

  author: postResolverFactory.relationField('author'),

  authorId: field.hidden,
})
```

In the above code, we use the `middlewares` option to define middleware. `async (next) => { ... }` defines a middleware. `useAuthedUser()` is a custom function used to get the currently logged - in user. If the user is not logged in, an error is thrown; otherwise, `next()` is called to continue execution.

### Creating a Resolver

You can directly create a Resolver from the resolver factory:

```ts
const userResolver = userResolverFactory.resolver()
```
In the above code, we use `userResolverFactory.resolver()` to create a Resolver.
This Resolver will include all queries, mutations, and fields in the resolver factory.

## Custom Type Mapping

To adapt to more Prisma types, we can extend GQLoom to add more type mappings.

First, we use `PrismaWeaver.config` to define the configuration of type mapping. Here we import `GraphQLDateTime` from [graphql - scalars](https://the - guild.dev/graphql/scalars). When encountering the `DateTime` type, we map it to the corresponding GraphQL scalar.

```ts twoslash
import { GraphQLDateTime } from 'graphql-scalars'
import { PrismaWeaver } from '@gqloom/prisma'

export const prismaWeaverConfig = PrismaWeaver.config({
  presetGraphQLType: (type) => {
    switch (type) {
      case 'DateTime':
        return GraphQLDateTime
    }
  },
})
```

Pass the configuration to the `weave` function when weaving the GraphQL Schema:
```ts
import { weave } from "@gqloom/core"

export const schema = weave(prismaWeaverConfig, userResolver, postResolver)
```

## Default Type Mapping

The following table lists the default mapping relationships between Prisma types and GraphQL types in GQLoom:

| Prisma Type | GraphQL Type     |
| ----------- | ---------------- |
| Int @id     | `GraphQLID`      |
| String @id  | `GraphQLID`      |
| BigInt      | `GraphQLInt`     |
| Int         | `GraphQLInt`     |
| Decimal     | `GraphQLFloat`   |
| Float       | `GraphQLFloat`   |
| Boolean     | `GraphQLBoolean` |
| DateTime    | `GraphQLString`  |
| String      | `GraphQLString`  |