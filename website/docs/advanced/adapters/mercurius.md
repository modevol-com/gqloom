# Mercurius

[Mercurius](https://mercurius.dev/) is a GraphQL adapter for [Fastify](https://www.fastify.io/)

## Installation

::: code-group
```sh [npm]
npm i fastify mercurius graphql @gqloom/core
```
```sh [pnpm]
pnpm add fastify mercurius graphql @gqloom/core
```
```sh [yarn]
yarn add fastify mercurius graphql @gqloom/core
```
```sh [bun]
bun add fastify mercurius graphql @gqloom/core
```
:::

## Usage 
```ts twoslash
// @filename: resolvers.ts
import { resolver, query, silk, weave } from "@gqloom/core"
import { GraphQLNonNull, GraphQLString } from "graphql"
import { createServer } from "node:http"
import { createYoga } from "graphql-yoga"

export const helloResolver = resolver({
  hello: query(
    silk<string>(new GraphQLNonNull(GraphQLString)),
    () => "Hello, World"
  ),
})
// @filename: index.ts
// ---cut---
import { weave } from "@gqloom/core"
import Fastify from "fastify"
import mercurius from "mercurius"
import { helloResolver } from "./resolvers"

const schema = weave(helloResolver)

const app = Fastify()
app.register(mercurius, { schema })
app.listen({ port: 4000 }, () => {
  console.info("Mercurius server is running on http://localhost:4000")
})
```

## Contexts

When using GQLoom together with `Mercurius`, you can use `MercuriusContext` to label the type of context:

```ts twoslash
import { useContext } from "@gqloom/core/context"
import { type MercuriusContext } from "mercurius"

export function useAuthorization() {
  return useContext<MercuriusContext>().reply.request.headers.authorization
}
```

You can also learn more about contexts in the [Mercurius documentation](https://mercurius.dev/#/docs/context).