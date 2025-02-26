---
title: Middleware
icon: Fence
---

# Middleware

Middleware is a function that intervenes in the processing flow of a parsed function. It provides a way to insert logic into the request and response flow to execute code before a response is sent or before a request is processed.
`GQLoom`'s middleware follows the onion middleware pattern of [Koa](https://koajs.com/#application).

## Define Middleware

Middleware is a function that will be injected with an `options` object as a parameter when called. The `options` object contains the following fields:
  - `outputSilk`: output silk, which includes the output type of the field currently being parsed;
  - `parent`: the parent node of the current field, equivalent to `useResolverPayload().root`;
  - `parseInput`: a function used to obtain the input of the current field;
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

### Error catching

When using [Valibot](./schema/valibot) or [Zod](./schema/zod) libraries for input validation, we can catch validation errors in the middleware and return customized error messages.

::: code-group
```ts twoslash [valibot]
import { type Middleware } from "@gqloom/core"
import { ValiError } from "valibot"
import { GraphQLError } from "graphql"

export const valibotExceptionFilter: Middleware = async (next) => {
  try {
    return await next()
  } catch (error) {
    if (error instanceof ValiError) {
      const { issues, message } = error
      throw new GraphQLError(message, { extensions: { issues } })
    }
    throw error
  }
}
```
```ts twoslash [zod]
import { type Middleware } from "@gqloom/core"
import { ZodError } from "zod"
import { GraphQLError } from "graphql"

export const zodExceptionFilter: Middleware = async (next) => {
  try {
    return await next()
  } catch (error) {
    if (error instanceof ZodError) {
      throw new GraphQLError(error.format()._errors.join(", "), {
        extensions: { issues: error.issues },
      })
    }
    throw error
  }
}
```
:::

### Validate output
In `GQLoom`, validation of parser output is not performed by default. However, we can validate the output of parser functions through middleware.

```ts twoslash
import { silk, type Middleware } from "@gqloom/core"

export const outputValidator: Middleware = async ({ next, outputSilk }) => {
  const output = await next()
  return await silk.parse(outputSilk, output)
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
import { z } from "zod"
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

#### Query

When we make the following query:
```GraphQL
{
  hello(name: "W")
}
```
A result similar to the following will be given:

::: code-group
```JSON [valibot]
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
```JSON [zod]
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
```GraphQL
{
  hello(name: "World")
}
```
It will get a response with no exceptions:
```JSON
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
import { createMemoization } from "@gqloom/core"
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
import { z } from "zod"
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
import { type Middleware, useResolverPayload } from "@gqloom/core"

export const logger: Middleware = async (next) => {
  const info = useResolverPayload()!.info

  const start = Date.now()
  const result = await next()
  const resolveTime = Date.now() - start

  console.log(`${info.parentType.name}.${info.fieldName} [${resolveTime} ms]`)
  return result
}
```

## Using middleware

GQLoom is able to apply middleware in a variety of scopes, including resolver functions, resolver local middleware, and global middleware.

### Resolve function middleware

We can use middleware directly in the resolve function by simply passing the `middlewares` field in the second argument of the operation constructor, for example:

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

```ts  twoslash [zod]
// @filename: middlewares.ts
import { type Middleware } from "@gqloom/core"
export const outputValidator: Middleware = (next) => next()
// @filename: main.ts
// ---cut---
import { resolver, query } from "@gqloom/zod"
import { z } from "zod"
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

We can also apply middleware at the resolver level, which will take effect for all operations within the resolver.
Simply pass the `middlewares` field in the last argument of the resolver constructor, for example:

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
import { z } from "zod"
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

### Global middleware
In order to apply global middleware, we need to pass in the middleware fields in the `weave` function, for example:

```ts
import { weave } from "@gqloom/core"
import { exceptionFilter } from "./middlewares"

export const schema = weave(helloResolver, exceptionFilter) // [!code hl]
```