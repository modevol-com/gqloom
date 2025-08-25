---
title: Apollo
---

[Apollo Server](https://www.apollographql.com/docs/apollo-server/) is an open-source, spec-compliant GraphQL server that's compatible with any GraphQL client, including [Apollo Client](https://www.apollographql.com/docs/react).
It's the best way to build a production-ready, self-documenting GraphQL API that can use data from any source.

## Installation

```sh tab="npm"
npm i graphql @apollo/server @gqloom/core
```
```sh tab="pnpm"
pnpm add graphql @apollo/server @gqloom/core
```
```sh tab="yarn"
yarn add graphql @apollo/server @gqloom/core
```
```sh tab="bun"
bun add graphql @apollo/server @gqloom/core
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
import { ApolloServer } from "@apollo/server"
import { startStandaloneServer } from "@apollo/server/standalone"
import { helloResolver } from "./resolvers"

const schema = weave(helloResolver)
const server = new ApolloServer({ schema })

startStandaloneServer(server, {
  listen: { port: 4000 },
}).then(({ url }) => {
  console.info(`🚀  Server ready at: ${url}`)
})
```

## Context

The default context for `Apollo Server` is an empty object, you need to pass the context to the resolvers manually.
See the [Apollo Server documentation](https://www.apollographql.com/docs/apollo-server/data/context) for more information.