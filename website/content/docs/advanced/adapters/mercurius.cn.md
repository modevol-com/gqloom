---
title: Mercurius
---

[Mercurius](https://mercurius.dev/) 是用于 [Fastify](https://www.fastify.io/) 的 GraphQL 适配器

## 安装

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

## 使用 
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

## 上下文

在与 `Mercurius` 同时使用 GQLoom 时，你可以使用 `MercuriusContext` 来标注上下的类型：

```ts twoslash
import { useContext } from "@gqloom/core"
import { type MercuriusContext } from "mercurius"

export function useAuthorization() {
  return useContext<MercuriusContext>().reply.request.headers.authorization
}
```

你还可以在 [Mercurius 文档](https://mercurius.dev/#/docs/context)中了解更多关于上下文的信息。