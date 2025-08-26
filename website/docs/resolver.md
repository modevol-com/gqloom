---
icon: RadioTower
---
<script setup>
import { InputSchemaCodes, inputSchema } from "@/components/input-schema.tsx"
</script>
# Resolver

A resolver is a place to put GraphQL operations (`query`, `mutation`, `subscription`).
Usually we put operations that are close to each other in the same resolver, for example user related operations in a resolver called `userResolver`.

## Distinguishing Operations
First, let's take a brief look at the basic operations of GraphQL and when you should use them:

- **Query** is an operation that is used to get data, such as getting user information, getting a list of products, and so on. Queries usually do not change the persistent data of the service.

- **Mutation** is an operation used to modify data, such as creating a user, updating user information, deleting a user, and so on. Mutation operations usually change the persistent data of a service.

- **Subscription** is an operation in which the server actively pushes data to the client. Subscription usually does not change the persistent data of the service. In other words, subscription is a real-time query.

## Defining a resolver

We use the `resolver` function to define the resolver:

```ts
import { resolver } from "@gqloom/core"

const helloResolver = resolver({})
```

In the code above, we have defined a resolver called `helloResolver`, which has no operations for now.

## Defining operations

Let's try to define the operation using the `query` function:

```ts twoslash
import { resolver, query, silk } from "@gqloom/core"
import { GraphQLNonNull, GraphQLString } from "graphql"

const helloResolver = resolver({
  hello: query(silk<string>(new GraphQLNonNull(GraphQLString))).resolve(
    () => "Hello, World"
  ),
})
```

In the code above, we have defined a `query` operation called `hello` which returns a non-null string.
Here, we're using the type definition provided by `graphql.js` directly, which as you can see can be slightly verbose, and we could have chosen to simplify the code by using the schema library, we can choose to use <span :class="[inputSchema==='valibot'?'input-schema-active':'input-schema']" @click="inputSchema='valibot'">Valibot</span> or <span :class="[inputSchema==='zod'?'input-schema-active':'input-schema']"  @click="inputSchema='zod'">Zod</span>:

<InputSchemaCodes>
<template v-slot:valibot>

We can define the return type of the `hello` operation using [valibot](./schema/valibot) to define the return type of the `hello` operation:

```ts twoslash
import { resolver, query } from "@gqloom/core"
import * as v from "valibot"

const helloResolver = resolver({
  hello: query(v.string()).resolve(() => "Hello, World"),
})
```

In the code above, we use `v.string()` to define the return type of the `hello` operation. We can directly use the `valibot` schema as the `silk`.

</template>
<template v-slot:zod>

We can define the return type of the `hello` operation using [zod](./schema/zod) to define the return type of the `hello` operation:

```ts twoslash
import { resolver, query } from "@gqloom/core"
import * as z from "zod"

const helloResolver = resolver({
  hello: query(z.string()).resolve(() => "Hello, World"),
})
```

In the code above, we use `z.string()` to define the return type of the `hello` operation, and the `zodSilk` function lets us use the Schema definition of `zod` as a `silk`.
</template>
</InputSchemaCodes>

## Define the inputs to operations
The `query`, `mutation`, and `subscription` operations can all accept input parameters.

Let's add an input parameter `name` to the `hello` operation:

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
In the code above, we passed in the `input` property in the second argument of the `query` function to define the input parameter: the `input` property is an object whose key is the name of the input parameter, and whose value is the type definition of the input parameter.

Here, we use `v.nullish(v.string(), “World”)` to define the `name` parameter, which is an optional string with a default value of `“World”`.
In the `resolve` function, we can get the value of the input parameter by the first parameter, and TypeScript will derive its type for us, in this case, we directly deconstruct to get the value of the `name` parameter.

</template>
<template v-slot:zod>

```ts twoslash
import { resolver, query } from '@gqloom/zod'
import * as z from "zod"

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
In the code above, we passed in the `input` property in the second argument of the `query` function to define the input parameter: the `input` property is an object whose key is the name of the input parameter, and whose value is the type definition of the input parameter.

Here, we use `z.string().nullish()` to define the `name` parameter, which is an optional string with a default value of `“World”`.
In the `resolve` function, we can get the value of the input parameter by the first parameter, and TypeScript will derive its type for us, in this case, we directly deconstruct to get the value of the `name` parameter.

</template>
</InputSchemaCodes>

## Adding more information to operations

We can also add more information to the action, such as `description`, `deprecationReason` and `extensions`:

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
import * as z from "zod"

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

## Object resolvers
In GraphQL, we can define resolvers for fields on an object to add additional properties to the object and create relationships between objects.
This allows GraphQL to build very flexible APIs while maintaining simplicity.

When using `GQLoom`, we can use the `resolver.of` function to define object resolvers.

We start by defining two simple objects `User` and `Book`:

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
import * as z from "zod"

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

In the above code, we have defined two objects `User` and `Book` which represent user and book.
In `Book`, we define an `authorID` field, which represents the author ID of the book.

In addition, we define two simple Map objects to store some predefined data:

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

Next, we define a `bookResolver`:

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
import * as z from "zod"

const bookResolver = resolver.of(Book, {
  books: query(z.array(Book)).resolve(() => Array.from(bookMap.values())),
})
```

</template>
</InputSchemaCodes>

In the above code, we have used the `resolver.of` function to define `bookResolver`, which is an object resolver for resolving `Book` objects.
In `bookResolver`, we define a `books` field, which is a query operation to get all the books.

Next, we will add an additional field called `author` to the `Book` object to get the author of the book:

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
import * as z from "zod"

const bookResolver = resolver.of(Book, {
  books: query(z.array(Book)).resolve(() => Array.from(bookMap.values())),

  author: field(User.nullish()).resolve((book) => userMap.get(book.authorID)), // [!code hl]
})
```

</template>
</InputSchemaCodes>

In the above code, we used the `field` function to define the `author` field.
The `field` function takes two parameters:
  - The first argument is the return type of the field;
  - The second parameter is a parsing function or option, in this case we use a parsing function: we get the `Book` instance from the first parameter of the parsing function, and then we get the corresponding `User` instance from the `userMap` based on the `authorID` field.

### Defining Field Inputs

In GraphQL, we can define input parameters for fields in order to pass additional data at query time.

In `GQLoom`, we can use the second argument of the `field` function to define the input parameters of a field.

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
import * as z from "zod"

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

In the above code, we used the `field` function to define the `signature` field.
The second argument to the `field` function is an object which contains two fields:
  - `input`: the input parameter of the field, which is an object containing a `name` field, which is of type `string`;
  - `resolve`: the field's resolver function, which takes two arguments: the first argument is the source object of the resolver constructed by `resolver.of`, which is an instance of `Book`; the second argument is the field's input parameter, which is an object that contains an input of the `name` field.

The `bookResolver` object we just defined can be woven into a GraphQL schema using the [weave](../weave) function:

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

The resulting GraphQL schema is as follows:

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

### Define Derived Fields

When writing resolvers for database tables or other persistent data, we often need to calculate new fields based on the data in the table, which are derived fields.
Derived fields require selecting the data they depend on when retrieving data. We can use `field().derivedFrom()` to declare the dependent data.
The derived dependencies will be used by `useResolvingFields()`, and this function is used to accurately obtain the fields required for the current query. 

<InputSchemaCodes>
<template v-slot:valibot>

```ts
import { field, resolver } from "@gqloom/core"
import * as v from "valibot"
import { giraffes } from "./table"

export const giraffeResolver = resolver.of(giraffes, {
  age: field(v.number())
    .derivedFrom("birthDate")
    .resolve((giraffe) => {
      const today = new Date()
      const age = today.getFullYear() - giraffe.birthDate.getFullYear()
      return age
    }),
})
```

</template>
<template v-slot:zod>

```ts
import { field, resolver } from "@gqloom/core"
import * as z from "zod"
import { giraffes } from "./table"

export const giraffeResolver = resolver.of(giraffes, {
  age: field(z.number())
    .derivedFrom("birthDate")
    .resolve((giraffe) => {
      const today = new Date()
      const age = today.getFullYear() - giraffe.birthDate.getFullYear()
      return age
    }),
})
```

</template>
</InputSchemaCodes>
