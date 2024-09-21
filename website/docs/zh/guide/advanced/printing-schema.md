# 打印 Schema

GraphQL 强大的一点是，GraphQL Schema 可以用来描述服务端所有的 API。

## 从 Schema 生成文件

我们可以使用来自 `graphql` 包的 `printSchema` 函数来打印出 Schema。

```ts
import { weave } from "@gqloom/core"
import { printSchema, lexicographicSortSchema } from "graphql"
import { HelloResolver } from "./resolvers"
import * as fs from "fs"

const schema = weave(HelloResolver)

const schemaText = printSchema(lexicographicSortSchema(schema))

if (process.env.NODE_ENV === "development") {
  fs.writeFileSync("schema.graphql", schemaText)
}
```

上面的代码会生成一个 `schema.graphql` 文件，其中包含 Schema 的所有内容。

## 使用 GraphQL Schema

GraphQL Schema 可以用于很多用途，常见的用途包括：

- 将来自多个微服务的 Schema 合并成一个[超级图](https://www.apollographql.com/docs/federation/building-supergraphs/subgraphs-overview)，以便在客户端进行跨服务的统一查询。这种架构被称为[联邦](./federation.mdx)。

- 在客户端使用[代码生成](https://the-guild.dev/graphql/codegen)进行开发和类型检查。

- 在客户端开发时与 TypeScript 集成，以便在开发过程中获得更好的类型检查和自动补全，更多信息请参阅 [gql.tada](https://gql-tada.0no.co/)。
