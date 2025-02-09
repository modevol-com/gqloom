---
title: Yoga
---

GraphQL Yoga is a batteries-included cross-platform [GraphQL over HTTP spec-compliant](https://github.com/enisdenjo/graphql-http/tree/master/implementations/graphql-yoga) GraphQL server 
powered by [Envelop](https://envelop.dev) and [GraphQL Tools](https://graphql-tools.com) that runs anywhere; 
focused on easy setup, performance and great developer experience.

## Installation

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
import { createServer } from "node:http"
import { createYoga } from "graphql-yoga"
import { helloResolver } from "./resolvers"

const schema = weave(helloResolver)

const yoga = createYoga({ schema })

createServer(yoga).listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
```

## Contexts

When using GQLoom together with `Yoga`, you can use `YogaInitialContext` to label the type of context:

```ts twoslash
import { useContext } from "@gqloom/core"
import { type YogaInitialContext } from "graphql-yoga"

export function useAuthorization() {
  return useContext<YogaInitialContext>().request.headers.get("Authorization")
}
```

You can also learn more about contexts in the [Yoga documentation](https://the-guild.dev/graphql/yoga-server/docs/features/context).