# Middleware

Middleware is a function that intervenes in the processing flow of a parsed function. It provides a way to insert logic into the request and response flow to execute code before a response is sent or before a request is processed.

`GQLoom`'s middleware follows the onion middleware pattern of [Koa](https://koajs.com/#application).

## Define Middleware

Middleware is a function that will be injected with an `options` object as a parameter when called. The `options` object contains the following fields:
  - `outputSilk`: output silk, which includes the output type of the field currently being parsed;
  - `parent`: the parent node of the current field, equivalent to `useResolverPayload().root`;
  - `parseInput`: a function used to obtain or modify the input of the current field;
  - `type`: the type of the current field, whose value can be `query`, `mutation`, `subscription`, or `field`;
  - `next`: a function used to call the next middleware;

The `options` object can also be directly used as the `next` function.

Additionally, we can use `useContext()` and `useResolverPayload()` to get the context and more information of the current resolver function.

A minimal middleware function is as follows:

```ts twoslash
import { Middleware } from '@gqloom/core';

const middleware: Middleware = async (next) => {
  return await next();
}
```

Next, we'll introduce some common types of middleware.

### JSON Schema Input Validation

::: tip
For input validation libraries that follow the [Standard Schema](https://standardschema.dev/), GQLoom will internally call their provided validation functions to validate the input, eliminating the need for additional input validation middleware.
:::

When using JSON Schema, we can use [Ajv](https://ajv.js.org/) for runtime validation of the input:

<<< @/snippets/code/middleware-ajv.ts{ts twoslash}

### Validate output

In `GQLoom`, validation of parser output is not performed by default. However, we can validate the output of parser functions through middleware.

```ts twoslash
import { silk, type Middleware } from "@gqloom/core"
import { GraphQLError } from "graphql"

export const outputValidator: Middleware = async (opts) => {
  const output = await opts.next()
  const result = await silk.parse(opts.outputSilk, output)
  if (result.issues) {
    throw new GraphQLError(result.issues[0].message, {
      extensions: { issues: result.issues },
    })
  }
  return result.value
}
```

Let's try to use this middleware:

#### Valibot

```ts twoslash
// @filename: middlewares.ts
import { type Middleware } from "@gqloom/core"
export const outputValidator: Middleware = (next) => next()
export const valibotExceptionFilter: Middleware = (next) => next()
// @filename: main.ts
// ---cut---
import { ValibotWeaver, weave, resolver, query } from "@gqloom/valibot"
import * as v from "valibot"
import { createServer } from "node:http"
import { createYoga } from "graphql-yoga"
import { outputValidator, valibotExceptionFilter } from "./middlewares"

const helloResolver = resolver({
  hello: query(v.pipe(v.string(), v.minLength(10)))
    .input({ name: v.string() })
    .use(outputValidator) // [!code hl]
    .resolve(({ name }) => `Hello, ${name}`),
})

export const schema = weave(ValibotWeaver, helloResolver, valibotExceptionFilter) // [!code hl]

const yoga = createYoga({ schema })
createServer(yoga).listen(4000, () => {
  // eslint-disable-next-line no-console
  console.info("Server is running on http://localhost:4000/graphql")
})
```
In the code above, we added the `v.minLength(10)` requirement to the output of the `hello` query and added the `outputValidator` middleware to the parser function.
We also added a global middleware `ValibotExceptionFilter` to `weave`.

#### Zod

```ts twoslash
// @filename: middlewares.ts
import { type Middleware } from "@gqloom/core"
export const outputValidator: Middleware = (next) => next()
export const zodExceptionFilter: Middleware = (next) => next()
// @filename: main.ts
// ---cut---
import { weave, resolver, query } from "@gqloom/zod"
import * as z from "zod"
import { createServer } from "node:http"
import { createYoga } from "graphql-yoga"
import { outputValidator, zodExceptionFilter } from "./middlewares"

const helloResolver = resolver({
  hello: query(z.string().min(10))
    .input({ name: z.string() })
    .use(outputValidator) // [!code hl]
    .resolve(({ name }) => `Hello, ${name}`),
})

export const schema = weave(helloResolver, zodExceptionFilter) // [!code hl]

const yoga = createYoga({ schema })
createServer(yoga).listen(4000, () => {
  // eslint-disable-next-line no-console
  console.info("Server is running on http://localhost:4000/graphql")
})
```

In the code above, we added a `z.string().min(10)` requirement to the output of the `hello` query and added the `outputValidator` middleware to the parser function.
We also added a global middleware `ValibotExceptionFilter` to `weave`.

#### Result

When we make the following query:
```graphql title="GraphQL Query"
{
  hello(name: "W")
}
```
A result similar to the following will be given:

::: code-group
```json [valibot]
{
  "errors": [
    {
      "message": "Invalid length: Expected >=10 but received 8",
      "locations": [
        {
          "line": 2,
          "column": 3
        }
      ],
      "path": [
        "hello"
      ],
      "extensions": {
        "issues": [
          {
            "kind": "validation",
            "type": "min_length",
            "input": "Hello, W",
            "expected": ">=10",
            "received": "8",
            "message": "Invalid length: Expected >=10 but received 8",
            "requirement": 10
          }
        ]
      }
    }
  ],
  "data": null
}
```
```json [zod]
{
  "errors": [
    {
      "message": "String must contain at least 10 character(s)",
      "locations": [
        {
          "line": 2,
          "column": 3
        }
      ],
      "path": [
        "hello"
      ],
      "extensions": {
        "issues": [
          {
            "code": "too_small",
            "minimum": 10,
            "type": "string",
            "inclusive": true,
            "exact": false,
            "message": "String must contain at least 10 character(s)",
            "path": []
          }
        ]
      }
    }
  ],
  "data": null
}
```
:::

If we adjust the input so that the returned string is the required length:
```graphql [GraphQL Query]
{
  hello(name: "World")
}
```
It will get a response with no exceptions:
```json
{
  "data": {
    "hello": "Hello, World"
  }
}
```
### Authentication

Checking a user's permissions is a common requirement that we can easily implement with middleware.

Consider that our user has the roles `“admin”` and `“editor”`, and we want the administrator and editor to have access to their own actions, respectively.
First, we implement an `authGuard` middleware that checks the user's role:

```ts twoslash
// @filename: context.ts
import { createMemoization } from "@gqloom/core/context"
export const useUser = createMemoization(()=> ({ 
  name:"", 
  id: 0, 
  roles: [] as ("admin" | "editor")[]
}))
// @filename: main.ts
// ---cut---
import { type Middleware } from "@gqloom/core"
import { useUser } from "./context"
import { GraphQLError } from "graphql"

export function authGuard(role: "admin" | "editor"): Middleware {
  return async (next) => {
    const user = await useUser()
    if (user == null) throw new GraphQLError("Not authenticated")
    if (!user.roles.includes(role)) throw new GraphQLError("Not authorized")
    return next()
  }
}
```
In the code above, we declare an `authGuard` middleware that takes a role parameter and returns a middleware function.
The middleware function checks that the user is authenticated and has the specified role, and throws a `GraphQLError` exception if the requirements are not satisfied.

We can apply different middleware for different resolvers:

::: code-group
```ts twoslash [valibot]
// @filename: middlewares.ts
import { type Middleware } from "@gqloom/core"
export function authGuard(role: "admin" | "editor"): Middleware {
  return (next) => next()
}
// @filename: main.ts
// ---cut---
import { resolver, mutation } from "@gqloom/core"
import * as v from "valibot"
import { authGuard } from "./middlewares"

const adminResolver = resolver(
  {
    deleteArticle: mutation(v.boolean(), () => true),
  },
  {
    middlewares: [authGuard("admin")], // [!code hl]
  }
)

const editorResolver = resolver(
  {
    createArticle: mutation(v.boolean(), () => true),

    updateArticle: mutation(v.boolean(), () => true),
  },
  { middlewares: [authGuard("editor")] } // [!code hl]
)
```
```ts twoslash [zod]
// @filename: middlewares.ts
import { type Middleware } from "@gqloom/core"
export function authGuard(role: "admin" | "editor"): Middleware {
  return (next) => next()
}
// @filename: main.ts
// ---cut---
import { resolver, mutation } from "@gqloom/zod"
import * as z from "zod"
import { authGuard } from "./middlewares"

const adminResolver = resolver(
  {
    deleteArticle: mutation(z.boolean(), () => true),
  },
  {
    middlewares: [authGuard("admin")], // [!code hl]
  }
)

const editorResolver = resolver(
  {
    createArticle: mutation(z.boolean(), () => true),

    updateArticle: mutation(z.boolean(), () => true),
  },
  { middlewares: [authGuard("editor")] } // [!code hl]
)
```
:::

In the code above, we have applied the `authGuard` middleware to `AdminResolver` and `EditorResolver` and assigned different roles to them. In this way, only users with the corresponding roles can access the actions within the corresponding resolvers.

### Logging

We can also implement logging functionality through middleware. For example, we can create a `logger` middleware to log the execution time of each field parsing function:

```ts twoslash
import { type Middleware } from "@gqloom/core"
import { useResolverPayload } from "@gqloom/core/context"

export const logger: Middleware = async (next) => {
  const info = useResolverPayload()!.info

  const start = Date.now()
  const result = await next()
  const resolveTime = Date.now() - start

  console.log(`${info.parentType.name}.${info.fieldName} [${resolveTime} ms]`)
  return result
}
```

### Caching

We can implement caching functionality through middleware. For example, we can create a `cache` middleware to cache the resolution results of each query:

```ts twoslash
import type { Middleware } from "@gqloom/core"

/** Simple in-memory cache implementation */
const cacheStore = new Map<string, { data: unknown; timestamp: number }>()

export interface CacheOptions {
  /**
   * Time to live in milliseconds
   * @default 60000
   */
  ttl?: number
}

export const cache = (options: CacheOptions = {}): Middleware => {
  const { ttl = 60000 } = options

  const middleware: Middleware = async ({ next, payload }) => {
    if (!payload?.info) {
      return next()
    }

    const { fieldName, parentType } = payload.info
    const args = payload.args || {}
    const cacheKey = `${parentType.name}.${fieldName}:${JSON.stringify(args)}`

    const cached = cacheStore.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data
    }

    const result = await next()
    cacheStore.set(cacheKey, { data: result, timestamp: Date.now() })
    return result
  }

  // Only apply cache to queries by default
  middleware.operations = ["query"]

  return middleware
}
```

### Modifying Input

We can modify the request input through middleware:

::: code-group
```ts twoslash [valibot]
const useUser = async () => ({ id: 1 })
// ---cut---
import { mutation, resolver } from "@gqloom/core"
import * as v from "valibot"

const Post = v.object({
  __typename: v.nullish(v.literal("Post")),
  id: v.number(),
  title: v.string(),
  content: v.string(),
  authorId: v.number(),
})

interface IPost extends v.InferOutput<typeof Post> {}

const posts: IPost[] = []

export const postsResolver = resolver({
  createPost: mutation(Post)
    .input(
      v.object({
        title: v.string(),
        content: v.string(),
        authorId: v.number(),
      })
    )
    .use(async ({ next, parseInput }) => { // [!code hl]
      const result = await parseInput.getResult() // [!code hl]
      result.authorId = (await useUser()).id // [!code hl]
      parseInput.setResult(result) // [!code hl]
      return next() // [!code hl]
    })
    .resolve(({ title, content, authorId }) => {
      const post = {
        id: Math.random(),
        title,
        content,
        authorId,
      }
      posts.push(post)
      return post
    }),
})
```
```ts twoslash [zod]
const useUser = async () => ({ id: 1 })
// ---cut---
import { mutation, resolver } from "@gqloom/core"
import * as z from "zod"

const Post = z.object({
  __typename: z.literal("Post").nullish(),
  id: z.number(),
  title: z.string(),
  content: z.string(),
  authorId: z.number(),
})

interface IPost extends z.output<typeof Post> {}

const posts: IPost[] = []

export const postsResolver = resolver({
  createPost: mutation(Post)
    .input(
      z.object({
        title: z.string(),
        content: z.string(),
        authorId: z.number(),
      })
    )
    .use(async ({ next, parseInput }) => { // [!code hl]
      const result = await parseInput.getResult() // [!code hl]
      result.authorId = (await useUser()).id // [!code hl]
      parseInput.setResult(result) // [!code hl]
      return next() // [!code hl]
    })
    .resolve(({ title, content, authorId }) => {
      const post = {
        id: Math.random(),
        title,
        content,
        authorId,
      }
      posts.push(post)
      return post
    }),
})
```
:::

## Using middleware

GQLoom is able to apply middleware in a variety of scopes, including resolver functions, resolver local middleware, and global middleware.

### Resolve function middleware

We can use middleware directly in the resolver function by using the `use` method during its construction, for example:

::: code-group
```ts twoslash [valibot]
// @filename: middlewares.ts
import { type Middleware } from "@gqloom/core"
export const outputValidator: Middleware = (next) => next()
// @filename: main.ts
// ---cut---
import { resolver, query } from "@gqloom/core"
import * as v from "valibot"
import { outputValidator } from "./middlewares"

const helloResolver = resolver({
  hello: query(v.pipe(v.string(), v.minLength(10)))
    .input({ name: v.string() })
    .use(outputValidator) // [!code hl]
    .resolve(({ name }) => `Hello, ${name}`),
})
```
```ts twoslash [zod]
// @filename: middlewares.ts
import { type Middleware } from "@gqloom/core"
export const outputValidator: Middleware = (next) => next()
// @filename: main.ts
// ---cut---
import { resolver, query } from "@gqloom/zod"
import * as z from "zod"
import { outputValidator } from "./middlewares"

const helloResolver = resolver({
  hello: query(z.string().min(10))
    .input({ name: z.string() })
    .use(outputValidator) // [!code hl]
    .resolve(({ name }) => `Hello, ${name}`),
})
```
:::

### Resolver-scoped middleware

We can also apply middleware at the resolver level, so the middleware will take effect for all operations within the resolver.
We just need to use the `use` method to add `middlewares` to the resolver:

::: code-group
```ts twoslash [valibot]
// @filename: middlewares.ts
import { type Middleware } from "@gqloom/core"
export function authGuard(role: "admin" | "editor"): Middleware {
  return (next) => next()
}
// @filename: main.ts
// ---cut---
import { resolver, mutation } from "@gqloom/core"
import * as v from "valibot"
import { authGuard } from "./middlewares"

const adminResolver = resolver({
  deleteArticle: mutation(v.boolean(), () => true),
}).use(authGuard("admin")) // [!code hl]

const editorResolver = resolver({
  createArticle: mutation(v.boolean(), () => true),

  updateArticle: mutation(v.boolean(), () => true),
}).use(authGuard("editor")) // [!code hl]
```
```ts twoslash [zod]
// @filename: middlewares.ts
import { type Middleware } from "@gqloom/core"
export function authGuard(role: "admin" | "editor"): Middleware {
  return (next) => next()
}
// @filename: main.ts
// ---cut---
import { resolver, mutation } from "@gqloom/zod"
import * as z from "zod"
import { authGuard } from "./middlewares"

const adminResolver = resolver({
  deleteArticle: mutation(z.boolean(), () => true),
}).use(authGuard("admin")) // [!code hl]

const editorResolver = resolver({
  createArticle: mutation(z.boolean(), () => true),

  updateArticle: mutation(z.boolean(), () => true),
}).use(authGuard("editor")) // [!code hl]
```
:::

### Global middleware
In order to apply global middleware, we need to pass in the middleware fields in the `weave` function, for example:

```ts
import { weave } from "@gqloom/core"
import { exceptionFilter } from "./middlewares"

export const schema = weave(helloResolver, exceptionFilter) // [!code hl]
```

### Applying Middleware Based on Operation Type

We can specify for which operation types a middleware should take effect.

```ts twoslash
const db = {} as {
  beginTransaction: () => Promise<void>
  commit: () => Promise<void>
  rollback: () => Promise<void>
}

// ---cut---
import type { Middleware } from "@gqloom/core"
import { GraphQLError } from "graphql"

export const transaction: Middleware = async ({ next }) => {
  try {
    await db.beginTransaction()

    const result = await next()

    await db.commit()

    return result
  } catch (error) {
    await db.rollback()
    throw new GraphQLError("Transaction failed", {
      extensions: { originalError: error },
    })
  }
}

transaction.operations = ["mutation"]
```

`Middleware.operations` is an array of strings used to specify on which operation types the middleware should take effect. The available values are:

- `"query"`;
- `"mutation"`;
- `"subscription"`;
- `"field"`;
- `"subscription.resolve"`;
- `"subscription.subscribe"`;

The default value for `Middleware.operations` is `["field", "query", "mutation", "subscription.subscribe"]`.