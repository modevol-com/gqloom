---
title: Prisma
---

[Prisma ORM](https://www.prisma.io/orm)凭借其直观的数据模型、自动迁移、类型安全和自动完成功能，使开发人员在使用数据库时获得了全新的体验。

`@gqloom/prisma` 提供了 GQLoom 与 Prisma 的集成：

- 从 Prisma Schema 生成[丝线](../silk)；
- 使用解析器工厂从 Prisma 快速生成 CRUD 操作。

## 安装

```sh tab="npm"
npm i -D prisma
npm i @gqloom/core @gqloom/prisma
```
```sh tab="pnpm"
pnpm add -D prisma
pnpm add @gqloom/core @gqloom/prisma
```
```sh tab="yarn"
yarn add -D prisma
yarn add @gqloom/core @gqloom/prisma
```
```sh tab="bun"
bun add -D prisma
bun add @gqloom/core @gqloom/prisma
```

在 [Prisma 文档](https://www.prisma.io/docs/getting-started/quickstart)中，你可以找到更多关于安装的信息。

## 配置

在 `prisma/schema.prisma` 文件中定义你的 Prisma Schema：

```prisma title="schema.prisma"
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

### generator 参数
`generator` 接受以下参数：

| 参数           | 说明                                                                      | 默认值                                  |
| -------------- | ------------------------------------------------------------------------- | --------------------------------------- |
| `gqloomPath`   | GQLoom 包的路径。                                                         | `@gqloom/prisma`                        |
| `clientOutput` | Prisma 客户端的路径。                                                     | `node_modules/@prisma/client`           |
| `output`       | 生成的文件所在的文件夹路径。                                              | `node_modules/@gqloom/prisma/generated` |
| `commonjsFile` | CommonJS 文件的文件名。使用空字符串 `""` 将跳过 CommonJS 文件的生成。     | `index.cjs`                             |
| `moduleFile`   | ES 模块文件的文件名。使用空字符串 `""` 将跳过 ES 模块文件的生成。         | `index.js`                              |
| `typesFiles`   | TypeScript 声明文件的文件名。使用 `[]` 将跳过 TypeScript 声明文件的生成。 | `["index.d.ts"]`                        |

### 生成丝线

```sh
npx prisma generate
```

## 使用丝线

在生成丝线后，我们可以在 `resolver` 中使用，同时我们使用 `useSelectedFields` 以确保只选择 GraphQL 查询所需要的字段：

```ts
import { resolver, query, field, weave } from '@gqloom/core'
import { asyncContextProvider } from '@gqloom/core/context'
import { useSelectedFields } from "@gqloom/prisma/context"
import { ValibotWeaver } from '@gqloom/valibot'
import { Post, User } from '@gqloom/prisma/generated'
import * as v from 'valibot'
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient({})

const userResolver = resolver.of(User, {
  user: query(User.nullable(), {
    input: { id: v.number() },
    resolve: ({ id }) => {
      return db.user.findUnique({
        select: useSelectedFields(User),
        where: { id },
      })
    },
  }),

  posts: field(Post.list(), async (user) => {
    const posts = await db.user
      .findUnique({ where: { id: user.id } })
      .posts({ select: useSelectedFields(Post) })
    return posts ?? []
  }),
})

const postResolver = resolver.of(Post, {
  author: field(User.nullable())
    .derivedFrom("authorId")
    .resolve((post) => {
      if (!post.authorId) return null
      return db.user.findUnique({ where: { id: post.authorId } })
    }),
})

export const schema = weave(asyncContextProvider, ValibotWeaver, userResolver, postResolver)
```

如上面的代码所示，我们可以直接在 `resolver` 里使用 Prisma 生成的类型。在这里我们定义了两个解析器：`userResolver` 和 `postResolver`。

在 `userResolver` 中，我们使用 `User` 作为 `resolver.of` 的父类型，并定义了两个字段：
- `user` 查询：返回类型是 `User.nullable()`，表示可能返回单个用户或 null。它接受一个 `id` 参数，并使用 Prisma 的 `findUnique` 方法查询数据库。
- `posts` 字段：返回类型是 `Post.list()`，表示返回该用户的所有文章列表。它通过 Prisma 的关系查询来获取用户的文章。

在 `postResolver` 中，我们使用 `Post` 作为父类型，定义了一个字段：
- `author` 字段：返回类型是 `User`，表示返回文章的作者。它通过 Prisma 的关系查询来获取文章的作者信息。

所有查询都使用了 `useSelectedFields()` 函数来确保只选择 GraphQL 查询中请求的字段，这有助于优化数据库查询性能。此函数需要[启用上下文](../context)。对于无法使用 `useSelectedFields()` 函数的运行时，我们也可以使用 `getSelectedFields()` 函数来获取当前查询需要选取的列。

### 派生字段

为模型添加派生字段非常简单，但需要注意使用 `field().derivedFrom()` 方法声明所依赖的列，以便 `useSelectedFields` 方法能正确地选取这些列：

```ts
export const postResolver = resolver.of(Post, {
  abstract: field(v.string())
    .derivedFrom("title", "content")
    .resolve((post) => {
      return `${post.title} ${post.content?.slice(0, 60)}...`
    }),
})
```

### 隐藏字段

`@gqloom/prisma` 默认将暴露所有字段。如果你希望隐藏某些字段，你可以使用 `field.hidden`：

```ts
const postResolver = resolver.of(Post, {
  author: field(User, async (post) => {
    const author = await db.post.findUnique({ where: { id: post.id } }).author()
    return author!
  }),

  authorId: field.hidden, // [!code hl]
})
```

在上面的代码中，我们隐藏了 `authorId` 字段，这意味着它将不会出现在生成的 GraphQL Schema 中。

## 解析器工厂

`@gqloom/prisma` 提供了 `PrismaResolverFactory` 来帮助你创建解析器工厂。  
使用解析器工厂，你可以快速定义常用的查询、变更和字段，解析器工厂还预置了常见操作输入的输入类型，使用解析器工厂可以大大减少样板代码，这在快速开发时非常有用。

```ts
import { Post, User } from '@gqloom/prisma/generated'
import { PrismaResolverFactory } from '@gqloom/prisma'

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient({})

const userResolverFactory = new PrismaResolverFactory(User, db)
const postResolverFactory = new PrismaResolverFactory(Post, db)
```
在上面的代码中，我们创建了 `User` 和 `Post` 模型的解析器工厂。`PrismaResolverFactory` 接受两个参数，第一个是作为丝线的模型，第二个是 `PrismaClient` 实例。

### 关系字段

解析器工厂提供了 `relationField` 方法来定义关系字段：

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
在上面的代码中，我们使用 `userResolverFactory.relationField('posts')` 和 `postResolverFactory.relationField('author')` 来定义关系字段。
`relationField` 方法接受一个字符串参数，表示关系字段的名称。

### 查询

解析器工厂预置了常用的查询：
  - countQuery
  - findFirstQuery
  - findManyQuery
  - findUniqueQuery

你可以直接使用它们：

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

在上面的代码中，我们使用 `userResolverFactory.findUniqueQuery()` 来定义 `user` 查询。解析器工厂将自动创建输入类型和解析函数。

### 变更

解析器工厂预置了常用的变更：
  - createMutation
  - createManyMutation
  - deleteMutation
  - deleteManyMutation
  - updateMutation
  - updateManyMutation
  - upsertMutation

你可以直接使用它们：

```ts
const postResolver = resolver.of(Post, {
  createPost: postResolverFactory.createMutation(), // [!code hl]

  author: postResolverFactory.relationField('author'),

  authorId: field.hidden,
})
```

在上面的代码中，我们使用 `postResolverFactory.createMutation()` 来定义 `createPost` 变更。工厂将自动创建输入类型和解析函数。

### 自定义输入

解析器工厂预置的查询和变更支持自定义输入，你可以通过 `input` 选项来定义输入类型：

```ts
import * as v from "valibot"

const userResolver = resolver.of(User, {
  user: userResolverFactory.findUniqueQuery().input(
    v.pipe( // [!code hl]
      v.object({ id: v.number() }), // [!code hl]
      v.transform(({ id }) => ({ where: { id } })) // [!code hl]
    ) // [!code hl]
  ),

  posts: userResolverFactory.relationField("posts"),
})
```

在上面的代码中，我们使用 `valibot` 来定义输入类型， `v.object({ id: v.number() })` 定义了输入对象的类型，`v.transform(({ id }) => ({ where: { id } }))` 将输入参数转换为 Prisma 的查询参数。

### 添加中间件

解析器工厂预置的查询、变更和字段支持添加中间件，你可以通过 `middlewares` 选项来定义中间件：

```ts
const postResolver = resolver.of(Post, {
  createPost: postResolverFactory.createMutation().use(async (next) => {
    const user = await useAuthedUser() // [!code hl]
    if (user == null) throw new GraphQLError("Please login first") // [!code hl]
    return next() // [!code hl]
  }), // [!code hl]

  author: postResolverFactory.relationField("author"),

  authorId: field.hidden,
})
```

在上面的代码中，我们使用 `middlewares` 选项来定义中间件，`async (next) => { ... }` 定义了一个中间件，`useAuthedUser()` 是一个自定义的函数，用于获取当前登录的用户，如果用户未登录，则抛出一个错误，否则调用 `next()` 继续执行。

### 创建 Resolver

你可以从解析器工厂中直接创建一个 Resolver：

```ts
// Readonly Resolver
const userQueriesResolver = userResolverFactory.queriesResolver()

// Full Resolver
const userResolver = userResolverFactory.resolver()
```

有两个用于创建 Resolver 的函数：

- `usersResolverFactory.queriesResolver()`: 创建一个只包含查询、关系字段的 Resolver。
- `usersResolverFactory.resolver()`: 创建一个包含所有查询、变更和关系字段的 Resolver。

## 自定义类型映射

为了适应更多的 Prisma 类型，我们可以拓展 GQLoom 为其添加更多的类型映射。

首先我们使用 `PrismaWeaver.config` 来定义类型映射的配置。这里我们导入来自 [graphql-scalars](https://the-guild.dev/graphql/scalars) 的 `GraphQLDateTime`，当遇到 `DateTime` 类型时，我们将其映射到对应的 GraphQL 标量。

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

在编织 GraphQL Schema 时传入配置到 weave 函数中：
```ts
import { weave } from "@gqloom/core"

export const schema = weave(prismaWeaverConfig, userResolver, postResolver)
```

## 默认类型映射

下表列出了 GQLoom 中 Prisma 类型与 GraphQL 类型之间的默认映射关系：

| Prisma 类型 | GraphQL 类型     |
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