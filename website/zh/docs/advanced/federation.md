# 联邦图（Federation）

[Apollo Federation](https://www.apollographql.com/docs/federation/) 让您可以声明性地将多个 GraphQL API 组合成一个单一的联合图。联邦图使客户端能够通过单个请求与多个 API 进行交互。

GQLoom Federation 提供了 GQLoom 对 Apollo Federation 的支持。

## 安装

::: code-group
```sh [npm]
npm i graphql @gqloom/core @apollo/subgraph @gqloom/federation
```
```sh [pnpm]
pnpm add graphql @gqloom/core @apollo/subgraph @gqloom/federation
```
```sh [yarn]
yarn add graphql @gqloom/core @apollo/subgraph @gqloom/federation
```
```sh [bun]
bun add graphql @gqloom/core @apollo/subgraph @gqloom/federation
```
:::

## GraphQL 指令

Apollo Federation 指令（[Directives](https://www.apollographql.com/docs/federation/federated-schemas/federated-directives/) ）用于描述如何将多个 GraphQL API 组合成一个联合图。

### 在对象上声明指令

在 GQLoom 中，我们可以在对象和字段的 `extensions` 属性中的 `directives` 字段来声明 GraphQL 指令：

::: code-group
```ts twoslash [valibot]
import * as v from "valibot"
import { asObjectType } from "@gqloom/valibot"

export const User = v.pipe(
  v.object({
    id: v.string(),
    name: v.string(),
  }),
  asObjectType({
    name: "User",
    extensions: {
      directives: { key: { fields: "id", resolvable: true } },
    },
  })
)

export interface IUser extends v.InferOutput<typeof User> {}
```

```ts [zod]
import * as z from "zod"
import { asObjectType } from "@gqloom/zod"

export const User = z
  .object({
    id: z.string(),
    name: z.string(),
  })
  .register(asObjectType, {
    name: "User",
    extensions: {
      directives: { key: { fields: "id", resolvable: true } },
    },
  })

export interface IUser extends z.infer<typeof User> {}
```

```ts twoslash [graphql.js]
import { silk } from "@gqloom/core"
import { GraphQLObjectType, GraphQLString, GraphQLNonNull } from "graphql"

export interface IUser {
  id: string
  name: string
}

export const User = silk(
  new GraphQLObjectType<IUser>({
    name: "User",
    fields: {
      id: { type: new GraphQLNonNull(GraphQLString) },
      name: { type: new GraphQLNonNull(GraphQLString) },
    },
    extensions: {
      directives: { key: { fields: "id", resolvable: true } },
    },
  })
)
```
:::

以上示例中，我们声明了一个 `@key` 指令，该指令将 `User` 对象的 `id` 字段标记为可解析字段，我们将得到如下的 Schema：

```graphql [GraphQL Schema]
type User
  @key(fields: "id", resolvable: true)
{
  id: String!
  name: String!
}
```

### 在解析器上声明指令

我们还可以使用解析器为对象声明指令：

```ts
export const userResolver = resolver
  .of(User, {
    // ...
  })
  .directives({ key: { fields: "id", resolvable: true } })
```

### 为 Schema 添加指令

```ts
const schema = FederatedSchemaLoom.weave(
  userResolver,
  FederatedSchemaLoom.config({
    extensions: {
      directives: {
        link: [
          {
            url: "https://specs.apollo.dev/federation/v2.6",
            import: ["@extends", "@external", "@key", "@shareable"],
          },
        ],
      },
    },
  })
)
```

### 指令格式

我们有两种声明指令的格式：
- 使用数组：
```json
{
  directives: [
    {
      name: "validation",
      args: {
        regex: "/abc+/"
      }
    },
    {
      name: "required",
      args: {},
    }
  ]
}
```
- 使用键值对：
```json
{
  directives: {
    validation: {
      regex: "/abc+/"
    },
    required: {}
  }
}
```

## 解析引用 | Resolve Reference

`@gqloom/federation` 提供了 `resolveReference` 函数来帮助您解析引用。

```ts twoslash
import { silk } from "@gqloom/core"
import { GraphQLObjectType, GraphQLString, GraphQLNonNull } from "graphql"

export interface IUser {
  id: string
  name: string
}

export const User = silk<IUser>(
  new GraphQLObjectType({
    name: "User",
    fields: {
      id: { type: new GraphQLNonNull(GraphQLString) },
      name: { type: new GraphQLNonNull(GraphQLString) },
    },
    extensions: {
      directives: { key: { fields: "id", resolvable: true } },
    },
  })
)

function getUserByID(id: string): IUser {
  return { id, name: "Jane Smith" }
}
// ---cut---
import { query } from "@gqloom/core"
import { resolveReference, resolver } from "@gqloom/federation"

export const userResolver = resolver
  .of(User, {
    user: query(User, () => ({ id: "1", name: "John" })),
  })
  .directives({ key: { fields: "id", resolvable: true } })
  .resolveReference((user) => getUserByID(user.id))
```

## 编织

从 `@gqloom/federation` 引入的 `FederatedSchemaWeaver.weave` 函数用于编织 Federation Schema。与 `@gqloom/core` 相比，`@gqloom/federation` 中的 `FederatedSchemaWeaver.weave` 函数将输出携带指令（Directives）的 Schema。

另外值得注意的是，我们需要使用从 `@apollo/subgraph` 引入的 `printSubgraphSchema` 函数将 Schema 转换为文本格式以保留指令（Directives）。

```ts twoslash
import { silk } from "@gqloom/core"
import { GraphQLObjectType, GraphQLString, GraphQLNonNull } from "graphql"

export interface IUser {
  id: string
  name: string
}

export const User = silk<IUser>(
  new GraphQLObjectType({
    name: "User",
    fields: {
      id: { type: new GraphQLNonNull(GraphQLString) },
      name: { type: new GraphQLNonNull(GraphQLString) },
    },
    extensions: {
      directives: { key: { fields: "id", resolvable: true } },
    },
  })
)

function getUserByID(id: string): IUser {
  return { id, name: "Jane Smith" }
}
import { resolver, query } from "@gqloom/core"
import { resolveReference } from "@gqloom/federation"

export const userResolver = resolver.of(
  User,
  {
    user: query(User, () => ({ id: "1", name: "John" })),
  },
  {
    extensions: {
      ...resolveReference<IUser, "id">((user) => getUserByID(user.id)),
    },
  }
)
// ---cut---
import { FederatedSchemaLoom } from "@gqloom/federation"
import { printSubgraphSchema } from "@apollo/subgraph"

const schema = FederatedSchemaLoom.weave(userResolver)
const schemaText = printSubgraphSchema(schema)
```
