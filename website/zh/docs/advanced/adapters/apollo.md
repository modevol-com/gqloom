# Apollo

[Apollo Server](https://www.apollographql.com/docs/apollo-server/) 是一款开源、符合规范的 GraphQL 服务器，与包括 [Apollo Client](https://www.apollographql.com/docs/react) 在内的任何 GraphQL 客户端兼容。
它是构建生产就绪、自文档化 GraphQL API 的最佳方式，可使用来自任何来源的数据。

## 安装

::: code-group
```sh [npm]
npm i graphql @apollo/server @gqloom/core
```
```sh [pnpm]
pnpm add graphql @apollo/server @gqloom/core
```
```sh [yarn]
yarn add graphql @apollo/server @gqloom/core
```
```sh [bun]
bun add graphql @apollo/server @gqloom/core
```
:::

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

## 上下文

`Apollo Server` 的默认上下文为空对象，你需要手动传递上下文到解析器中。
更多信息请查看 [Apollo Server 文档](https://www.apollographql.com/docs/apollo-server/data/context)。