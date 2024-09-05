# [GQLoom](../../README.zh-CN.md)

[English](./README.md) | 简体中文

[GQLoom](../../README.zh-CN.md) 是一个用于 TypeScript/JavaScript 的 GraphQL 编织器，使用 Zod、Yup 或者 Valibot 来愉快地编织 GraphQL Schema, 支持完善的类型推断以提供最好的开发体验。

# GQLoom Federation

[Apollo Federation](https://www.apollographql.com/docs/federation/) 让您可以声明性地将多个 GraphQL API 组合成一个单一的联合图。这种联合图使客户端能够通过单个请求与多个 API 进行交互。

GQLoom Federation 提供了 GQLoom 对 Apollo Federation 的支持。

## GraphQL 指令｜GraphQL Directives

Apollo Federation [Directives](https://www.apollographql.com/docs/federation/federated-schemas/federated-directives/) 用于描述如何将多个 GraphQL API 组合成一个联合图。

在 GQLoom 中，我们可以在对象和字段的 `extensions` 属性中的 `directives` 字段来声明 GraphQL 指令。

#### 在对象上设置指令

```ts
interface IUser {
  id: string
  name: string
}
const User = silk<IUser>(
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
```

## 解析引用｜Resolve Reference

`@gqloom/apollo` 提供了 `resolveReference` 函数来帮助您解析引用。

```ts
import { loom } from "@gqloom/apollo"
import { resolveReference } from "@gqloom/apollo"

const { resolver, query } = loom
export const UserResolver = resolver.of(
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
```

## 编织｜Wave

从 `@gqloom/federation` 引入的 `wave` 函数用于编织 Federation Schema。与 `@gqloom/core` 相比，`@gqloom/apollo` 中的 `wave` 函数将输出携带指令（Directives）的 Schema。

```ts
import { wave } from "@gqloom/federation"
import { printSubgraphSchema } from "@apollo/subgraph"

const schema = weave(UserResolver)
const subgraphSchema = printSubgraphSchema(schema)
```
