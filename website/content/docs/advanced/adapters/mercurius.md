---
title: Mercurius
---

[Mercurius](https://mercurius.dev/) is a GraphQL adapter for [Fastify](https://www.fastify.io/)

## Installation

```sh tab="npm"
npm i fastify mercurius graphql @gqloom/core
```
```sh tab="pnpm"
pnpm add fastify mercurius graphql @gqloom/core
```
```sh tab="yarn"
yarn add fastify mercurius graphql @gqloom/core
```
```sh tab="bun"
bun add fastify mercurius graphql @gqloom/core
```

## Usage 
```ts
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
import { useContext } from "@gqloom/core"
import { type MercuriusContext } from "mercurius"

export function useAuthorization() {
  return useContext<MercuriusContext>().reply.request.headers.authorization
}
```

You can also learn more about contexts in the [Mercurius documentation](https://mercurius.dev/#/docs/context).