---
title: Yoga
---

[GraphQL Yoga](https://the-guild.dev/graphql/yoga-server) 是一款包含电池的跨平台 [GraphQL over HTTP 规范兼容](<(https://github.com/enisdenjo/graphql-http/tree/master/implementations/graphql-yoga)>)的 GraphQL 服务器，
由 [Envelop](https://envelop.dev/) 和 [GraphQL Tools](https://graphql-tools.com/) 提供支持，可在任何地方运行；
重点在于简易设置、性能和良好的开发人员体验。

## 安装

```sh tab="npm"
npm i graphql graphql-yoga @gqloom/core
```
```sh tab="pnpm"
pnpm add graphql graphql-yoga @gqloom/core
```
```sh tab="yarn"
yarn add graphql graphql-yoga @gqloom/core
```
```sh tab="bun"
bun add graphql graphql-yoga @gqloom/core
```

## 使用

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
import { createServer } from "node:http"
import { createYoga } from "graphql-yoga"
import { helloResolver } from "./resolvers"

const schema = weave(helloResolver)

const yoga = createYoga({ schema })

createServer(yoga).listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
```

## 上下文

在与 `Yoga` 同时使用 GQLoom 时，你可以使用 `YogaInitialContext` 来标注上下的类型：

```ts twoslash
import { useContext } from "@gqloom/core/context"
import { type YogaInitialContext } from "graphql-yoga"

export function useAuthorization() {
  return useContext<YogaInitialContext>().request.headers.get("Authorization")
}
```

你还可以在 [Yoga 文档](https://the-guild.dev/graphql/yoga-server/docs/features/context)中了解更多关于上下文的信息。