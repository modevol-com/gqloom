---
title: 中间件（Middleware）
icon: Fence
---

# 中间件（Middleware）

中间件是一种函数，它介入了解析函数的处理流程。它提供了一种在请求和响应流程中插入逻辑的方式，以便在发送响应之前或在请求处理之前执行代码。
`GQLoom` 的中间件遵循了 [Koa](https://koajs.com/#application) 的洋葱式中间件模式。

## 定义中间件

中间件是一个函数，它将在调用时被注入 `options` 对象作为参数，`options` 包含以下字段：
  - `outputSilk`: 输出丝线，包含了当前正在解析字段的输出类型；
  - `parent`: 当前字段的父节点，相当于 `useResolverPayload().root`；
  - `parseInput`: 用于获取当前字段输入的函数；
  - `type`: 当前字段的类型，其值为 `query`, `mutation`, `subscription` 或 `field`；
  - `next`: 用于调用下一个中间件的函数；

`options` 还可以直接作为 `next` 函数使用。
 
另外，我们还可以通过 `useContext()` 和 `useResolverPayload()` 获取到当前解析函数的上下文以及更多信息。

一个最基础的中间件函数如下：

```ts twoslash
import { Middleware } from '@gqloom/core';

const middleware: Middleware = async (next) => {
  return await next();
}
```

接下来，我们将介绍一些常见的中间件形式。

### 错误捕获

在使用 [Valibot](../schema/valibot) 或 [Zod](../schema/zod) 等库进行输入验证时，我们可以在中间件中捕获验证错误，并返回自定义的错误信息。

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

### 验证输出
在 `GQLoom`中，默认不会对解析函数的输出执行验证。但我们可以通过中间件来验证解析函数的输出。

```ts twoslash
import { silk, type Middleware } from "@gqloom/core"

export const outputValidator: Middleware = async ({ next, outputSilk }) => {
  const output = await next()
  return await silk.parse(outputSilk, output)
}
```

让我们尝试使用这个中间件：

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
在上面的代码中，我们对 `hello` 查询的输出添加了 `v.minLength(10)` 的要求，并在解析函数中添加了 `outputValidator` 中间件。
我们还在 `weave` 中添加了一个全局中间件 `ValibotExceptionFilter`。

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

在上面的代码中，我们对 `hello` 查询的输出添加了 `z.string().min(10)` 的要求，并在解析函数中添加了 `outputValidator` 中间件。
我们还在 `weave` 中添加了一个全局中间件 `ValibotExceptionFilter`。

#### 查询

当我们进行以下查询时：
```GraphQL
{
  hello(name: "W")
}
```
将会得到类似如下的结果：

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

如果我们调整输入，使返回的字符串长度符合要求：
```GraphQL
{
  hello(name: "World")
}
```
将会得到没有异常的响应：
```JSON
{
  "data": {
    "hello": "Hello, World"
  }
}
```

### 鉴权

对用户的权限进行校验是一个常见的需求，我们可以通过中间件来轻易实现。

考虑我们的用户有 `"admin"` 和 `"editor"` 两种角色，我们希望管理员和编辑员分别可以访问自己的操作。
首先，我们实现一个 `authGuard` 中间件，用于校验用户的角色：

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
在上面的代码中，我们声明了一个 `authGuard` 中间件，它接受一个角色参数，并返回一个中间件函数。
中间件函数会检查用户是否已经认证，并且是否具有指定的角色，如果不符合要求，则抛出一个 `GraphQLError` 异常。

我们可以为不同的解析器应用不同的中间件：

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

在上面的代码中，我们为 `adminResolver` 和 `editorResolver` 分别应用了 `authGuard` 中间件，并指定了不同的角色。这样，只有具有相应角色的用户才能访问对应解析器内的操作。

### 日志

我们也可以通过中间件来实现日志记录功能。例如，我们可以创建一个 `logger` 中间件，用于记录每个字段解析函数的执行时间：
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

## 使用中间件

GQLoom 能够在各种范围内应用中间件，包括解析函数、解析器局部中间件和全局中间件。

### 解析函数中间件

我们可以在解析函数中直接使用中间件，只需要在操作构造函数的第二个参数中传入 `middlewares` 字段，例如：

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

### 解析器局部中间件

我们也可以在解析器级别应用中间件，这样中间件将对解析器内的所有操作生效。
只需要在解析器构造函数的最后一个参数中传入 `middlewares` 字段，例如：

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

### 全局中间件
为了应用全局中间件，我们需要在 `weave` 函数中传入中间件字段，例如：

```ts
import { weave } from "@gqloom/core"
import { exceptionFilter } from "./middlewares"

export const schema = weave(helloResolver, exceptionFilter) // [!code hl]
```