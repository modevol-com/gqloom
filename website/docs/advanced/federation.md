---
title: Federation
---

# Federation

[Apollo Federation](https://www.apollographql.com/docs/federation/) lets you declaratively combine multiple GraphQL APIs into a single, federated graph. This federated graph enables clients to interact with multiple APIs through a single request.

GQLoom Federation provides GQLoom support for Apollo Federation.

## Installation

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

## GraphQL Directives

Apollo Federation [Directives](https://www.apollographql.com/docs/federation/federated-schemas/federated-directives/) is used to describe how to combine multiple GraphQL APIs into a federated graph.

In GQLoom, we can declare GraphQL directives in the `directives` field of the `extensions` property of objects and fields:

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

```ts twoslash [zod]
import { z } from "zod"
import { asObjectType } from "@gqloom/zod"

export const User = z
  .object({
    id: z.string(),
    name: z.string(),
  })
  .superRefine(
    asObjectType({
      name: "User",
      extensions: {
        directives: { key: { fields: "id", resolvable: true } },
      },
    })
  )

export interface IUser extends z.infer<typeof User> {}
```

```ts twoslash [graphql.js]
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
```
:::

In the above example, we have declared a `@key` directive which marks the `id` field of the `User` object as a resolvable field and we will get the following Schema:

```graphql title="GraphQL Schema"
type User
  @key(fields: "id", resolvable: true)
{
  id: String!
  name: String!
}
```

We have two formats for declaring instructions:
- Using arrays:
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
- Using key-value pairs:
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

## Resolve Reference

`@gqloom/apollo` provides the `resolveReference` function to help you resolve references.

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
```

## Weaving

The `FederatedSchemaWeaver.weave` function, introduced from `@gqloom/federation`, is used to weave Federation Schema. compared to `@gqloom/core`, the ` FederatedSchemaWeaver.weave` function in `@gqloom/apollo` will output Schema with Directives.

It is also worth noting that we need to use the `printSubgraphSchema` function imported from `@apollo/subgraph` to convert the Schema to a textual format in order to preserve the Directives.

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

