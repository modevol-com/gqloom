---
title: 数据加载器（Dataloader）
icon: HardDriveDownload
---

# 数据加载器（Dataloader）

由于 GraphQL 的灵活性，当我们加载某个对象的关联对象时，我们通常需要执行多个查询。
这就造成了著名的 N+1 查询问题。为了解决这个问题，我们可以使用 [DataLoader](https://github.com/graphql/dataloader)。

`DataLoader` 能够将多个请求合并为一个请求，从而减少数据库的查询次数，同时还能缓存查询结果，避免重复查询。

## 示例

考虑我们有如下简单对象 `User` 和 `Book`：

::: code-group
```ts twoslash [valibot]
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
```ts twoslash [zod]
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
:::

在 `Book` 对象上，我们有一个 `authorID` 字段，它引用了 `User` 对象的 `id` 字段。

另外，我们还需要准备一些简单的数据：

```ts twoslash
interface IUser {
  id: number
  name: string
}
interface IBook {
  id: number
  title: string
  authorID: number
}
// ---cut---
const users: IUser[] = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
  { id: 3, name: "Charlie" },
  { id: 4, name: "David" },
  { id: 5, name: "Eve" },
  { id: 6, name: "Frank" },
  { id: 7, name: "Grace" },
  { id: 8, name: "Heidi" },
  { id: 9, name: "Igor" },
  { id: 10, name: "Jack" },
]

const books: IBook[] = [
  { id: 1, title: "The Cat in the Hat", authorID: 1 },
  { id: 2, title: "Green Eggs and Ham", authorID: 1 },
  { id: 3, title: "War and Peace", authorID: 2 },
  { id: 4, title: "1984", authorID: 2 },
  { id: 5, title: "The Great Gatsby", authorID: 3 },
  { id: 6, title: "To Kill a Mockingbird", authorID: 3},
]
```

让我们为 `Book` 对象编写一个简单的解析器：

::: code-group
```ts twoslash [valibot]
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

const users: IUser[] = []

const books: IBook[] = []
// ---cut---
import { resolver, query, field } from "@gqloom/core"

const BookResolver = resolver.of(Book, {
  books: query(v.array(Book)).resolve(() => books),
  
  author: field(v.nullish(User)).resolve((book) =>
    users.find((u) => u.id === book.authorID)
  ),
})
```
```ts twoslash [zod]
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

const users: IUser[] = []

const books: IBook[] = []
// ---cut---
import { resolver, query, field } from "@gqloom/zod"

const BookResolver = resolver.of(Book, {
  books: query(Book.array()).resolve(() => books),
  
  author: field(User.nullish()).resolve((book) =>
    users.find((u) => u.id === book.authorID)
  ),
})
```
:::

在上面的代码中，我们为 `Book` 对象定义了一个额外字段 `author`，它将返回与 `authorID` 字段匹配的 `User` 对象。我们还定义了一个名为 `books` 的查询，它将返回所有 `Book` 对象。
在这里，我们直接使用 `users` 数组来查找用户。对于下面的查询：
```GraphQL
query books {
  books {
    id
    title
    author {
      id
      name
    }
  }
}
```
我们会为每个 `Book` 实例查询 `author` 字段，在此过程中，我们将直接遍历 `users` 数组以查找与 `authorID` 字段匹配的用户。
在这里我们共有 6 个 `Book` 实例，因此我们将执行 6 次查找操作。有没有更好的方法来减少查询次数呢？

### 使用 DataLoader

接下来，我们将使用 DataLoader 来优化我们的查询。

我们可以使用来自 `@gqloom/core` 包的提供基本功能的 `EasyDataLoader` 类，也可以使用更流行的 [DataLoader](https://github.com/graphql/dataloader)

#### 定义批量查询

::: code-group
```ts twoslash [valibot]
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

const users: IUser[] = []

const books: IBook[] = []
// ---cut---
import {
  EasyDataLoader,
  createMemoization,
  field,
  query,
  resolver,
} from "@gqloom/core"

const useUserLoader = createMemoization(
  () =>
    new EasyDataLoader(async (authorIDs: number[]) => {
      const authorIDSet = new Set(authorIDs)
      const authorMap = new Map<number, IUser>()
      for (const user of users) {
        if (authorIDSet.has(user.id)) {
          authorMap.set(user.id, user)
        }
      }
      return authorIDs.map((authorID) => authorMap.get(authorID))
    })
)

const BookResolver = resolver.of(Book, {
  books: query(v.array(Book)).resolve(() => books),

  author: field(v.nullish(User)).resolve((book) =>
    useUserLoader().load(book.authorID)
  ),
})

```
```ts twoslash [zod]
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

const users: IUser[] = []

const books: IBook[] = []
// ---cut---
import {
  EasyDataLoader,
  createMemoization,
  field,
  query,
  resolver,
} from "@gqloom/core"

const useUserLoader = createMemoization(
  () =>
    new EasyDataLoader(async (authorIDs: number[]) => {
      const authorIDSet = new Set(authorIDs)
      const authorMap = new Map<number, IUser>()
      for (const user of users) {
        if (authorIDSet.has(user.id)) {
          authorMap.set(user.id, user)
        }
      }
      return authorIDs.map((authorID) => authorMap.get(authorID))
    })
)

const BookResolver = resolver.of(Book, {
  books: query(Book.array()).resolve(() => books),

  author: field(User.nullish()).resolve((book) =>
    useUserLoader().load(book.authorID)
  ),
})

```
:::

在上面的代码中，我们使用 `createMemoization` 创建了一个 `useUserLoader` 函数，该函数返回一个 `DataLoader` 实例。
记忆化函数确保在同一个请求内总是使用相同的 `DataLoader` 实例。

在 `createMemoization` 中，我们直接构建了 `EasyDataLoader` 实例，并传递了一个查询函数，让我们深入了解这个查询函数是如何工作的：

1. 我们在构造 `EasyDataLoader` 时传递了一个参数为 `number[]` 的批量查询函数。

2. 在查询函数中，我们接收一个 `authorIDs` 数组，该数组包含要加载的 `User` 对象的 `id`。当我们对 `Book` 对象调用 `author` 字段时，`DataLoader` 会自动合并同一个请求内的所有 `authorID`，并传递给查询函数。

3. 在查询函数中，我们首先创建一个 `Set` 对象，用于快速检查 `authorID` 是否存在于 `authorIDs` 数组中。

4. 然后，我们创建一个 `Map` 对象，用于存储 `authorID` 和 `User` 对象之间的映射关系。

5. 接下来，我们遍历 `users` 数组，如果 `user.id` 存在于 `authorIDSet` 中，则将其添加到 `authorMap` 中。

6. 最后，我们根据 `authorIDs` 数组的顺序，从 `authorMap` 中获取对应的 `User` 对象，并返回一个包含这些 `User` 对象的数组。

::: info
必须保证查询函数的返回数组顺序与 `IDs` 数组顺序一致。`DataLoader` 依赖于此顺序来正确地合并结果。
:::

如此一来，我们就可以在 `BookResolver` 中使用 `useUserLoader` 函数来加载 `Book` 对象的 `author` 字段了。
为所有 6 个 `Book` 实例调用 `author` 字段时，`DataLoader` 会自动合并这些请求，并只对 `users` 数组进行一次遍历，从而提高了性能。