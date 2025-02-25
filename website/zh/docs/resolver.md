---
title: 解析器（Resolver）
icon: RadioTower
---
<script setup>
import InputSchemaCodes from "@/components/input-schema-codes.vue"
import { inputSchema } from "@/components/input-schema.ts"
</script>

# 解析器（Resolver）

解析器（Resolver）是用来放着 GraphQL 操作（`query`、`mutation`、`subscription`）的地方。
通常我们将业务相近的操作放在同一个解析器中，比如将用户相关的操作放在一个名为 `userResolver` 的解析器中。

## 区分操作

首先，我们简单地了解一下 GraphQL 的基本操作和应该在什么时候使用它们：

- **查询（Query）** 是用来获取数据的操作，比如获取用户信息、获取商品列表等。查询操作通常不会改变服务的持久化数据。

- **变更（Mutation）** 是用来修改数据的操作，比如创建用户、更新用户信息、删除用户等。变更操作通常会改变服务的持久化数据。

- **订阅（Subscription）** 是服务端主动推送数据给客户端的操作，订阅操作通常不会改变服务的持久化数据。或者说，订阅是实时的查询（Query）。

## 定义解析器

我们使用 `resolver` 函数来定义解析器：

```ts twoslash
import { resolver } from "@gqloom/core"

const helloResolver = resolver({})
```

在上面的代码中，我们定义了一个名为 `helloResolver` 的解析器，它暂时没有任何操作。

## 定义操作

让我们尝试使用 `query` 函数来定义操作：

```ts twoslash
import { resolver, query, silk } from "@gqloom/core"
import { GraphQLNonNull, GraphQLString } from "graphql"

const helloResolver = resolver({
  hello: query(silk<string>(new GraphQLNonNull(GraphQLString))).resolve(
    () => "Hello, World"
  ),
})
```

在上面的代码中，我们定义了一个名为 `hello` 的 `query` 操作，它返回一个非空字符串。
在这里，我们直接使用 `graphql.js` 提供的类型定义，如你所见，这可能略显啰嗦，我们可以选择使用模式库来简化代码，可以选择使用 <span :class="[inputSchema==='valibot'?'input-schema-active':'input-schema']" @click="inputSchema='valibot'">Valibot</span> 或者 <span :class="[inputSchema==='zod'?'input-schema-active':'input-schema']"  @click="inputSchema='zod'">Zod</span> ：

<InputSchemaCodes>
<template v-slot:valibot>

我们可以使用 [valibot](../schema/valibot) 来定义 `hello` 操作的返回类型：

```ts twoslash
import { resolver, query } from "@gqloom/core"
import * as v from "valibot"

const helloResolver = resolver({
  hello: query(v.string()).resolve(() => "Hello, World"),
})
```

在上面的代码中，我们使用 `v.sting()` 来定义 `hello` 操作的返回类型，我们可以直接把 `valibot` 的 Schema 作为`丝线`使用。

</template>
<template v-slot:zod>

我们可以使用 [zod](../schema/zod) 来定义 `hello` 操作的返回类型：

```ts twoslash
import { resolver, query } from "@gqloom/core"
import { z } from "zod"

const helloResolver = resolver({
  hello: query(z.string()).resolve(() => "Hello, World"),
})
```

在上面的代码中，我们使用 `z.string()` 来定义 `hello` 操作的返回类型，`zodSilk` 函数让我们把 `zod` 的 Schema 定义作为`丝线`使用。

</template>
</InputSchemaCodes>

## 定义操作的输入

`query`、`mutation`、`subscription` 操作都可以接受输入参数。

让我们为 `hello` 操作添加一个输入参数 `name`：
<InputSchemaCodes>
<template v-slot:valibot>

```ts twoslash
import { resolver, query } from '@gqloom/core'
import * as v from "valibot"

const helloResolver = resolver({
  hello: query(v.string())
    .input({ // [!code hl]
      name: v.nullish(v.string(), "World"), // [!code hl]
    }) // [!code hl]
    .resolve(({ name }) => `Hello, ${name}`),
})
```
在上面的代码中，我们在 `query` 函数的第二个参数中传入了 `input` 属性来定义输入参数：`input` 属性是一个对象，它的键是输入参数的名称，值是输入参数的类型定义。

在这里，我们使用 `v.nullish(v.string(), "World")` 来定义 `name` 参数，它是一个可选的字符串，默认值为 `"World"`。
在 `resolve` 函数中，我们可以通过第一个参数来获取输入参数的值，TypeScript 将会为我们推导其类型，在这里，我们直接解构得到 `name` 参数的值。

</template>
<template v-slot:zod>

```ts twoslash
import { resolver, query } from '@gqloom/zod'
import { z } from "zod"

const helloResolver = resolver({
  hello: query(z.string())
    .input({ // [!code hl]
      name: z // [!code hl]
        .string() // [!code hl]
        .nullish() // [!code hl]
        .transform((value) => value ?? "World"), // [!code hl]
    }) // [!code hl]
    .resolve(({ name }) => `Hello, ${name}`),
})
```
在上面的代码中，我们在 `query` 函数的第二个参数中传入了 `input` 属性来定义输入参数：`input` 属性是一个对象，它的键是输入参数的名称，值是输入参数的类型定义。

在这里，我们使用 `z.string().nullish()` 来定义 `name` 参数，它是一个可选的字符串，默认值为 `"World"`。
在 `resolve` 函数中，我们可以通过第一个参数来获取输入参数的值，TypeScript 将会为我们推导其类型，在这里，我们直接解构得到 `name` 参数的值。

</template>
</InputSchemaCodes>

## 为操作添加更多信息

我们还可以为操作添加更多信息，比如 `description`、`deprecationReason` 和 `extensions`：

<InputSchemaCodes>
<template v-slot:valibot>

```ts twoslash
import { resolver, query } from '@gqloom/core'
import * as v from "valibot"

const helloResolver = resolver({
  hello: query(v.string())
    .description("Say hello to someone") // [!code hl]
    .input({ name: v.nullish(v.string(), "World") })
    .resolve(({ name }) => `Hello, ${name}!`),
})
```

</template>
<template v-slot:zod>

```ts twoslash
import { resolver, query } from '@gqloom/zod'
import { z } from "zod"

const helloResolver = resolver({
  hello: query(z.string())
    .description("Say hello to someone") // [!code hl]
    .input({
      name: z
        .string()
        .nullish()
        .transform((value) => value ?? "World"),
    })
    .resolve(({ name }) => `Hello, ${name ?? "World"}!`),
})
```

</template>
</InputSchemaCodes>

## 对象解析器

在 GraphQL 中，我们可以为对象上的字段定义解析函数，以此为对象添加额外的属性以及创建对象之间的关系。
这使得 GraphQL 能够构建非常灵活同时保持简洁的 API。

当使用 `GQLoom` 时，我们可以使用 `resolver.of` 函数来定义对象解析器。

我们首先定义两个简单对象 `User` 和 `Book`：

<InputSchemaCodes>
<template v-slot:valibot>

```ts twoslash
import * as v from "valibot"

const User = v.object({
  __typename: v.nullish(v.literal("User")),
  id: v.number(),
  name: v.string(),
})

interface IUser extends v.InferOutput<typeof User> {}

const Book = v.object({
  __typename: v.nullish(v.literal("Book")),
  id: v.number(),
  title: v.string(),
  authorID: v.number(),
})

interface IBook extends v.InferOutput<typeof Book> {}
```

</template>
<template v-slot:zod>

```ts twoslash
import { z } from "zod"

const User = z.object({
  __typename: z.literal("User").nullish(),
  id: z.number(),
  name: z.string(),
})

interface IUser extends z.infer<typeof User> {}

const Book = z.object({
  __typename: z.literal("Book").nullish(),
  id: z.number(),
  title: z.string(),
  authorID: z.number(),
})

interface IBook extends z.infer<typeof Book> {}
```

</template>
</InputSchemaCodes>

在上面的代码中，我们定义了两个对象 `User` 和 `Book`，它们分别表示用户和书籍。
在 `Book` 中，我们定义了一个 `authorID` 字段，它表示书籍的作者 ID。

另外我们定义两个简单的 Map 对象来存储一些预设数据：
```ts twoslash
interface IUser {
  id: number
  name: string
  __typename?: "User" | null | undefined
}

interface IBook {
  id: number
  title: string
  authorID: number
  __typename?: "Book" | null | undefined
}
// ---cut---
const userMap: Map<number, IUser> = new Map(
  [
    { id: 1, name: "Cao Xueqin" },
    { id: 2, name: "Wu Chengen" },
  ].map((user) => [user.id, user])
)

const bookMap: Map<number, IBook> = new Map(
  [
    { id: 1, title: "Dream of Red Mansions", authorID: 1 },
    { id: 2, title: "Journey to the West", authorID: 2 },
  ].map((book) => [book.id, book])
)
```

接下来，我们定义一个 `bookResolver`：

<InputSchemaCodes>
<template v-slot:valibot>

```ts twoslash
const User = v.object({
  __typename: v.nullish(v.literal("User")),
  id: v.number(),
  name: v.string(),
})

interface IUser extends v.InferOutput<typeof User> {}

const Book = v.object({
  __typename: v.nullish(v.literal("Book")),
  id: v.number(),
  title: v.string(),
  authorID: v.number(),
})

interface IBook extends v.InferOutput<typeof Book> {}

const userMap: Map<number, IUser> = new Map(
  [
    { id: 1, name: "Cao Xueqin" },
    { id: 2, name: "Wu Chengen" },
  ].map((user) => [user.id, user])
)

const bookMap: Map<number, IBook> = new Map(
  [
    { id: 1, title: "Dream of Red Mansions", authorID: 1 },
    { id: 2, title: "Journey to the West", authorID: 2 },
  ].map((book) => [book.id, book])
)
// ---cut---
import { resolver, query } from '@gqloom/core'
import * as v from "valibot"

const bookResolver = resolver.of(Book, {
  books: query(v.array(Book)).resolve(() => Array.from(bookMap.values())),
})
```

</template>
<template v-slot:zod>

```ts twoslash
const User = z.object({
  __typename: z.literal("User").nullish(),
  id: z.number(),
  name: z.string(),
})

interface IUser extends z.infer<typeof User> {}

const Book = z.object({
  __typename: z.literal("Book").nullish(),
  id: z.number(),
  title: z.string(),
  authorID: z.number(),
})

interface IBook extends z.infer<typeof Book> {}

const userMap: Map<number, IUser> = new Map(
  [
    { id: 1, name: "Cao Xueqin" },
    { id: 2, name: "Wu Chengen" },
  ].map((user) => [user.id, user])
)

const bookMap: Map<number, IBook> = new Map(
  [
    { id: 1, title: "Dream of Red Mansions", authorID: 1 },
    { id: 2, title: "Journey to the West", authorID: 2 },
  ].map((book) => [book.id, book])
)
// ---cut---
import { resolver, query } from '@gqloom/zod'
import { z } from "zod"

const bookResolver = resolver.of(Book, {
  books: query(z.array(Book)).resolve(() => Array.from(bookMap.values())),
})
```

</template>
</InputSchemaCodes>

在上面的代码中，我们使用 `resolver.of` 函数来定义 `bookResolver`，它是一个对象解析器，用于解析 `Book` 对象。
在 `bookResolver` 中，我们定义了一个 `books` 字段，它是一个查询操作，用于获取所有的书籍。

接下来，我们将为 `Book` 对象添加一个名为 `author` 的额外字段用于获取书籍的作者：
<InputSchemaCodes>
<template v-slot:valibot>

```ts twoslash
const User = v.object({
  __typename: v.nullish(v.literal("User")),
  id: v.number(),
  name: v.string(),
})

interface IUser extends v.InferOutput<typeof User> {}

const Book = v.object({
  __typename: v.nullish(v.literal("Book")),
  id: v.number(),
  title: v.string(),
  authorID: v.number(),
})

interface IBook extends v.InferOutput<typeof Book> {}

const userMap: Map<number, IUser> = new Map(
  [
    { id: 1, name: "Cao Xueqin" },
    { id: 2, name: "Wu Chengen" },
  ].map((user) => [user.id, user])
)

const bookMap: Map<number, IBook> = new Map(
  [
    { id: 1, title: "Dream of Red Mansions", authorID: 1 },
    { id: 2, title: "Journey to the West", authorID: 2 },
  ].map((book) => [book.id, book])
)
// ---cut---
import { resolver, query, field } from '@gqloom/core'
import * as v from "valibot"

const bookResolver = resolver.of(Book, {
  books: query(v.array(Book)).resolve(() => Array.from(bookMap.values())),

  author: field(v.nullish(User)).resolve((book) => userMap.get(book.authorID)), // [!code hl]
})
```

</template>
<template v-slot:zod>

```ts twoslash
const User = z.object({
  __typename: z.literal("User").nullish(),
  id: z.number(),
  name: z.string(),
})

interface IUser extends z.infer<typeof User> {}

const Book = z.object({
  __typename: z.literal("Book").nullish(),
  id: z.number(),
  title: z.string(),
  authorID: z.number(),
})

interface IBook extends z.infer<typeof Book> {}

const userMap: Map<number, IUser> = new Map(
  [
    { id: 1, name: "Cao Xueqin" },
    { id: 2, name: "Wu Chengen" },
  ].map((user) => [user.id, user])
)

const bookMap: Map<number, IBook> = new Map(
  [
    { id: 1, title: "Dream of Red Mansions", authorID: 1 },
    { id: 2, title: "Journey to the West", authorID: 2 },
  ].map((book) => [book.id, book])
)
// ---cut---
import { resolver, query, field } from '@gqloom/zod'
import { z } from "zod"

const bookResolver = resolver.of(Book, {
  books: query(z.array(Book)).resolve(() => Array.from(bookMap.values())),

  author: field(User.nullish()).resolve((book) => userMap.get(book.authorID)), // [!code hl]
})
```
</template>
</InputSchemaCodes>

在上面的代码中，我们使用 `field` 函数来定义 `author` 字段。
`field` 函数接受两个参数：
  - 第一个参数是字段的返回类型；
  - 第二个参数是解析函数或选项，在这里我们使用了一个解析函数：我们从解析函数的第一个参数获取 `Book` 实例，然后根据 `authorID` 字段从 `userMap` 中获取对应的 `User` 实例。

### 定义字段输入

在 GraphQL 中，我们可以为字段定义输入参数，以便在查询时传递额外的数据。

在 `GQLoom` 中，我们可以使用 `field` 函数的第二个参数来定义字段的输入参数。

<InputSchemaCodes>
<template v-slot:valibot>

```ts twoslash
const User = v.object({
  __typename: v.nullish(v.literal("User")),
  id: v.number(),
  name: v.string(),
})

interface IUser extends v.InferOutput<typeof User> {}

const Book = v.object({
  __typename: v.nullish(v.literal("Book")),
  id: v.number(),
  title: v.string(),
  authorID: v.number(),
})

interface IBook extends v.InferOutput<typeof Book> {}

const userMap: Map<number, IUser> = new Map(
  [
    { id: 1, name: "Cao Xueqin" },
    { id: 2, name: "Wu Chengen" },
  ].map((user) => [user.id, user])
)

const bookMap: Map<number, IBook> = new Map(
  [
    { id: 1, title: "Dream of Red Mansions", authorID: 1 },
    { id: 2, title: "Journey to the West", authorID: 2 },
  ].map((book) => [book.id, book])
)
// ---cut---
import { resolver, query, field } from '@gqloom/core'
import * as v from "valibot"

const bookResolver = resolver.of(Book, {
  books: query(v.array(Book)).resolve(() => Array.from(bookMap.values())),

  author: field(v.nullish(User)).resolve((book) => userMap.get(book.authorID)),

  signature: field(v.string()) // [!code hl]
    .input({ name: v.string() }) // [!code hl]
    .resolve((book, { name }) => { // [!code hl]
      return `The book ${book.title} is in ${name}'s collection.` // [!code hl]
    }), // [!code hl]
})
```
</template>
<template v-slot:zod>

```ts twoslash
const User = z.object({
  __typename: z.literal("User").nullish(),
  id: z.number(),
  name: z.string(),
})

interface IUser extends z.infer<typeof User> {}

const Book = z.object({
  __typename: z.literal("Book").nullish(),
  id: z.number(),
  title: z.string(),
  authorID: z.number(),
})

interface IBook extends z.infer<typeof Book> {}

const userMap: Map<number, IUser> = new Map(
  [
    { id: 1, name: "Cao Xueqin" },
    { id: 2, name: "Wu Chengen" },
  ].map((user) => [user.id, user])
)

const bookMap: Map<number, IBook> = new Map(
  [
    { id: 1, title: "Dream of Red Mansions", authorID: 1 },
    { id: 2, title: "Journey to the West", authorID: 2 },
  ].map((book) => [book.id, book])
)
// ---cut---
import { resolver, query, field } from '@gqloom/zod'
import { z } from "zod"

const bookResolver = resolver.of(Book, {
  books: query(z.array(Book)).resolve(() => Array.from(bookMap.values())),

  author: field(User.nullish()).resolve((book) => userMap.get(book.authorID)),

  signature: field(z.string()) // [!code hl]
    .input({ name: z.string() }) // [!code hl]
    .resolve((book, { name }) => { // [!code hl]
      return `The book ${book.title} is in ${name}'s collection.` // [!code hl]
    }), // [!code hl]
})
```

</template>
</InputSchemaCodes>

在上面的代码中，我们使用 `field` 函数来定义 `signature` 字段。
`field` 函数的第二个参数是一个对象，它包含两个字段：
  - `input`：字段的输入参数，它是一个对象，包含一个 `name` 字段，它的类型是 `string`；
  - `resolve`：字段的解析函数，它接受两个参数：第一个参数由 `resolver.of` 构造的解析器的源对象，即 `Book` 实例；第二个参数是字段的输入参数，即包含 `name` 字段的输入。

刚刚我们定义的 `bookResolver` 对象可以通过 [weave](../weave) 函数编织成 GraphQL schema：

<InputSchemaCodes>
<template v-slot:valibot>

```ts
import { weave } from '@gqloom/core'
import { ValibotWeaver } from '@gqloom/valibot'

export const schema = weave(ValibotWeaver, bookResolver)
```

</template>
<template v-slot:zod>

```ts
import { weave } from '@gqloom/core'
import { ZodWeaver } from '@gqloom/zod'

export const schema = weave(ZodWeaver, bookResolver)
```

</template>
</InputSchemaCodes>

最终得到的 GraphQL schema 如下：

```graphql title="GraphQL Schema"
type Book {
  id: ID!
  title: String!
  authorID: ID!
  author: User
  signature(name: String!): String!
}

type User {
  id: ID!
  name: String!
}

type Query {
  books: [Book!]!
}
```