---
title: Context
icon: Shuffle
---

# Context

In the Node.js world, Context allows us to share data and state within the same request. In GraphQL, contexts allow data to be shared between multiple [resolver functions](./resolver) and [middleware](./middleware) for the same request.

A common use case is to store the identity of the current visitor in the context to be accessed in the resolver function and middleware.

## Accessing Contexts

In `GQLoom`, we access the context through the `useContext()` function.

GQLoom's `useContext` function is designed to reference [React](https://zh-hans.react.dev/)'s `useContext` function.
You can call the `useContext` function from anywhere within the [resolver](./resolver) to access the context of the current request without explicitly passing the `context` function.
Behind the scenes, `useContext` uses Node.js' [AsyncLocalStorage](https://nodejs.org/api/async_context.html#class-asynclocalstorage) to pass the context implicitly.

Next, let's try to access the context in various places.
We will use [graphql-yoga](https://the-guild.dev/graphql/yoga-server) as an adapter.

### Accessing contexts in resolve functions

::: code-group
```ts twoslash [valibot]
import { query, resolver, useContext, weave } from "@gqloom/core"
import { ValibotWeaver } from "@gqloom/valibot"
import * as v from "valibot"
import { type YogaInitialContext, createYoga } from "graphql-yoga"
import { createServer } from "http"

const helloResolver = resolver({
  hello: query(v.string(), () => {
    const user = // [!code hl]
      useContext<YogaInitialContext>().request.headers.get("Authorization") // [!code hl]
    return `Hello, ${user ?? "World"}`
  }),
})

const yoga = createYoga({ schema: weave(ValibotWeaver, helloResolver) })
createServer(yoga).listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
```
```ts twoslash [zod]
import { query, resolver, useContext, weave } from "@gqloom/core"
import { ZodWeaver } from "@gqloom/zod"
import { z } from "zod"
import { type YogaInitialContext, createYoga } from "graphql-yoga"
import { createServer } from "http"

const helloResolver = resolver({
  hello: query(z.string(), () => {
    const user = // [!code hl]
      useContext<YogaInitialContext>().request.headers.get("Authorization") // [!code hl]
    return `Hello, ${user ?? "World"}`
  }),
})

const yoga = createYoga({ schema: weave(ZodWeaver, helloResolver) })
createServer(yoga).listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
```
:::

In the code above, we use the `useContext` function to get the `Authorization` header of the current request from the context and concatenate it with the `Hello` string.
The `useContext` function accepts a generic parameter that specifies the type of the context, in this case we passed in the `YogaInitialContext` type.

Let's try to call this query:
```shell
curl -X POST http://localhost:4000/graphql -H "content-type: application/json" -H "authorization: Tom" --data-raw '{"query": "query { hello }"}'
```
You should get the following response:
```json
{"data":{"hello":"Hello, Tom"}}
```

### Accessing contexts in middleware

```ts twoslash
import { useContext, Middleware } from "@gqloom/core"
import { type YogaInitialContext } from "graphql-yoga"

function useUser() {
  const user =
    useContext<YogaInitialContext>().request.headers.get("Authorization")
  return user
}

const authGuard: Middleware = (next) => {
  const user = useUser()
  if (!user) throw new Error("Please login first")
  return next()
}
```
In the code above, we created a custom hook called `useUser` that uses the `useContext` function to get the `Authorization` header of the current request from the context.
We then created a middleware called `authGuard` which uses the `useUser` hook to fetch the user and throw an error if the user is not logged in.

To learn more about middleware, see [middleware documentation](./middleware).

### Accessing contexts while validating inputs

#### Valibot

We can customize the validation or transformation in `valibot` and access the context directly within it.
```ts twoslash
const UserService = {
  getUserByAuthorization: async (authorization: string | null) => {
    return { name: "World" }
  },
}
// ---cut---
import { query, resolver, useContext, weave } from "@gqloom/core"
import { ValibotWeaver } from "@gqloom/valibot"
import * as v from "valibot"
import { type YogaInitialContext, createYoga } from "graphql-yoga"
import { createServer } from "http"

async function useUser() {
  const authorization =
    useContext<YogaInitialContext>().request.headers.get("Authorization")
  const user = await UserService.getUserByAuthorization(authorization)
  return user
}

const helloResolver = resolver({
  hello: query(v.string(), {
    input: {
      name: v.pipeAsync( 
        v.nullish(v.string()),
        v.transformAsync(async (value) => { // [!code hl]
          if (value != null) return value // [!code hl]
          const user = await useUser() // [!code hl]
          return user.name // [!code hl]
        }) // [!code hl]
      ),
    },
    resolve: ({ name }) => `Hello, ${name}`,
  }),
})

const yoga = createYoga({ schema: weave(ValibotWeaver, helloResolver) })
createServer(yoga).listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
```

In the code above, we use `useUser()` in `v.transformAsync` to get the user information in the context and return it as the value of `name`.

#### Zod

We can customize the validation or transformation in `zod` and access the context directly within it:
```ts twoslash
const UserService = {
  getUserByAuthorization: async (authorization: string | null) => {
    return { name: "World" }
  },
}
// ---cut---
import { query, resolver, useContext, weave } from "@gqloom/core"
import { ZodWeaver } from "@gqloom/zod"
import { z } from "zod"
import { type YogaInitialContext, createYoga } from "graphql-yoga"
import { createServer } from "http"

async function useUser() {
  const authorization =
    useContext<YogaInitialContext>().request.headers.get("Authorization")
  const user = await UserService.getUserByAuthorization(authorization)
  return user
}

const helloResolver = resolver({
  hello: query(z.string(), {
    input: {
      name: z
        .string()
        .nullish()
        .transform(async (value) => { // [!code hl]
          if (value != null) return value // [!code hl]
          const user = await useUser() // [!code hl]
          return user.name // [!code hl]
        }), // [!code hl]
    },
    resolve: ({ name }) => `Hello, ${name}`,
  }),
})

const yoga = createYoga({ schema: weave(ZodWeaver, helloResolver) })
createServer(yoga).listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
```
In the code above, we use `useUser()` in `z.transform` to get the user information in the context and return it as the value of `name`.

## Memorization

Consider that we access the user through the following custom function:

```ts twoslash
const UserService = {
  getUserByAuthorization: async (authorization: string | null) => {
    return { name: "World" }
  },
}
// ---cut---
import { useContext } from "@gqloom/core"
import { type YogaInitialContext } from "graphql-yoga"

async function useUser() {
  const authorization =
    useContext<YogaInitialContext>().request.headers.get("Authorization")
  const user = await UserService.getUserByAuthorization(authorization)
  return user
}
```

We may execute some expensive operations in `useUser()`, such as fetching user information from the database, and we may also call it multiple times in the same request.
To avoid the extra overhead of multiple calls, we can use memoization to cache the results and reuse them in subsequent calls.

In GQLoom, we use the `createMemoization` function to create a memoized function.
A memoization function caches its results in the context after the first call and returns the cached results directly in subsequent calls.
That is, the memoized function will only be executed once in the same request, no matter how many times it is called.

Let's memoize the `useUser()` function:

```ts twoslash
const UserService = {
  getUserByAuthorization: async (authorization: string | null) => {
    return { name: "World" }
  },
}
import { useContext } from "@gqloom/core"
import { type YogaInitialContext } from "graphql-yoga"
// ---cut---
import { createMemoization } from "@gqloom/core"

const useUser = createMemoization(async () => {
  const authorization =
    useContext<YogaInitialContext>().request.headers.get("Authorization")
  const user = await UserService.getUserByAuthorization(authorization)
  return user
})
```
As you can see, we simply wrap the function in the `createMemoization` function.
We can then call `useUser()` from anywhere within the resolver without worrying about the overhead of multiple calls.

## Accessing Resolver Payload

In addition to the `useContext` function, GQLoom provides the `useResolverPayload` function for accessing all parameters in the resolver:

- root: the previous object, not normally used for fields on the root query type;

- args: the arguments provided for the field in the GraphQL query;

- context: the context object shared across parser functions and middleware;

- info: contains information about the current resolver call, such as the path to the GraphQL query, field names, etc;

- field: the definition of the field being resolved by the current resolver;

## Using Contexts across Adapters

In the GraphQL ecosystem, each adapter provides a different context object, and you can learn how to use it in the Adapters chapter:

- [Yoga](./advanced/adapters/yoga)
- [Apollo](./advanced/adapters/apollo)
- [Mercurius](./advanced/adapters/mercurius)
