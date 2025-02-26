---
title: Dataloader
icon: HardDriveDownload
---

# Dataloader

Due to the flexibility of GraphQL, we often need to execute multiple queries when we load an object's associated objects.
This causes the famous N+1 query problem. To solve this problem, we can use [DataLoader](https://github.com/graphql/dataloader).

The `DataLoader` is able to reduce the number of queries to the database by merging multiple requests into a single one, and also caches the results of the query to avoid repetitive queries.

## Example

Consider that we have the following simple objects `User` and `Book`:

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

On the `Book` object, we have an `authorID` field that references the `id` field of the `User` object.

In addition, we need to prepare some simple data:

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

Let's write a simple resolver for the `Book` object:

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

In the above code, we have defined an additional field `author` for `Book` objects which will return `User` objects matching the `authorID` field. We also define a query called `books` that will return all `Book` objects.
Here, we use the `users` array directly to find users. For the following query:
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
We will look up the `author` field for each `Book` instance, and in doing so, we will directly traverse the `users` array to find users that match the `authorID` field.
Here we have 6 `Book` instances, so we will execute 6 lookups. Is there a better way to reduce the number of queries?


### Using the DataLoader
Next, we'll use the DataLoader to optimize our query.

We can use the `EasyDataLoader` class from the `@gqloom/core` package for basic functionality, or opt for the more popular [DataLoader](https://github.com/graphql/dataloader).

#### Defining Batch Queries

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

In the code above, we used `createMemoization` to create a `useUserLoader` function that returns a `EasyDataLoader` instance.
The memoization function ensures that the same `EasyDataLoader` instance is always used within the same request.

Inside `createMemoization`, we directly construct an `EasyDataLoader` instance and pass a query function. Let's delve into how this query function works:

1. We pass a batch query function that takes a parameter of type `number[]` when constructing the `EasyDataLoader`.

2. In the query function, we receive an array of `authorIDs` containing the `id` of the `User` object to be loaded. When we call the `author` field on the `Book` object, the `DataLoader` automatically merges all the `authorIDs` within the same request and passes them to the query function.

3. In the query function, we first create a `Set` object, which we use to quickly check if `authorID` exists in the `authorIDs` array.

4. We then create a `Map` object to store the mapping between `authorID` and `User` objects.

5. Next, we iterate through the `users` array and add `user.id` to the `authorMap` if it exists in the `authorIDSet`.

6. Finally, we retrieve the corresponding `User` objects from `authorMap` in the order of the `authorIDs` array and return an array containing those `User` objects.

::: info
It must be ensured that the order of the return array of the query function matches the order of the `IDs` array. The `DataLoader` relies on this order to merge the results correctly.
:::

In this way, we can use the `useUserLoader` function in `BookResolver` to load the `author` field of the `Book` object.
When calling the `author` field for all 6 `Book` instances, `DataLoader` automatically merges these requests and iterates through the `users` array only once, thus improving performance.