---
title: Hono
---

[Hono](https://hono.dev/) 是一个小巧、简单且超快速的 Web 框架，基于 Web 标准构建，能够在多种 JavaScript 运行时环境中运行。它具有零依赖、轻量级的特点，且提供简洁的 API 和一流的 TypeScript 支持，适合构建 Web API、边缘应用等多种应用场景。

## 安装

```package-install
hono @hono/graphql-server graphql @gqloom/core
```

## 使用

```ts
import { weave } from "@gqloom/core"
import { graphqlServer } from "@hono/graphql-server"
import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { helloResolver } from "./resolvers"

export const app = new Hono()

const schema = weave(helloResolver)

app.use("/graphql", graphqlServer({ schema, graphiql: true }))

serve(app, (info) => {
  console.info(
    `GraphQL server is running on http://localhost:${info.port}/graphql`
  )
})
```

## 上下文

在与 Hono 同时使用 GQLoom 时，你可以使用 hono 的 `Context` 来标注上下的类型：

```ts
import { useContext } from "@gqloom/core"
import type { Context } from "hono"

export function useAuthorization() {
  return useContext<Context>().req.header().authorization
}
```

在 [Hono 文档](https://hono.dev/docs/api/context) 中了解更多信息。