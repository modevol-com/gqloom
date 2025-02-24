---
title: Hono
---

[Hono](https://hono.dev/) is a small, simple, and extremely fast web framework built based on web standards and capable of running in various JavaScript runtime environments. It has the characteristics of zero dependencies and being lightweight, and provides a concise API and first-class TypeScript support. It is suitable for building various application scenarios such as web APIs and edge applications.

## Installation

```package-install
hono @hono/graphql-server graphql @gqloom/core
```

## Usage

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

## Context

When using GQLoom together with Hono, you can use Hono's `Context` to annotate the type of the context:

```ts
import { useContext } from "@gqloom/core"
import type { Context } from "hono"

export function useAuthorization() {
  return useContext<Context>().req.header().authorization
}
```

Learn more in the [Hono documentation](https://hono.dev/docs/api/context). 