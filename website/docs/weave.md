---
title: Weave 
icon: Dam
---

# Weave

In GQLoom, the `weave` function is used to weave multiple Resolvers or Silks into a single GraphQL Schema.

The `weave` function can take [resolver](./resolver), [silk](./silk), weaver configuration, global [middleware](./middleware)

## Weaving resolvers
The most common usage is to weave multiple resolvers together, for example:

```ts
import { weave } from '@gqloom/core';

export const schema = weave(helloResolver, catResolver);
```
## Weaving a single silk

Sometimes we need to weave a single [silk](../silk) woven into a GraphQL Schema, for example:

::: code-group
```ts twoslash
import { resolver, query, mutation, field } from '@gqloom/core'

const helloResolver = resolver({
  hello: query(v.string(), () => "Hello, World"),
})

const Cat = v.object({
  __typename: v.nullish(v.literal("Cat")),
  name: v.string(),
  birthDate: v.string(),
})

const catResolver = resolver({
  createCat: mutation(Cat, {
    input: {
      data: Cat,
    },
    resolve: ({ data }) => data,
  }),
})
// ---cut---
import { weave } from '@gqloom/core'
import { ValibotWeaver } from '@gqloom/valibot'
import * as v from "valibot"

const Dog = v.object({
  __typename: v.nullish(v.literal("Dog")),
  name: v.string(),
  age: v.number(),
})

export const schema = weave(ValibotWeaver, helloResolver, catResolver, Dog);
```
```ts twoslash
import { resolver, query, mutation, field } from '@gqloom/core'

const helloResolver = resolver({
  hello: query(z.string(), () => "Hello, World"),
})

const Cat = z.object({
  __typename: z.literal("Cat").nullish(),
  name: z.string(),
  birthDate: z.string(),
})

const catResolver = resolver({
  createCat: mutation(Cat, {
    input: {
      data: Cat,
    },
    resolve: ({ data }) => data,
  }),
})
// ---cut---
import { weave } from '@gqloom/core'
import { ZodWeaver } from '@gqloom/zod'
import { z } from "zod"

const Dog = z.object({
  __typename: z.literal("Dog").nullish(),
  name: z.string(),
  age: z.number(),
})

export const schema = weave(ZodWeaver, helloResolver, catResolver, Dog);
```
:::

## Weaver configuration

### Input type naming conversion
In GraphQL, objects are recognized as [type](https://graphql.org/graphql-js/object-types/) and [input](https://graphql.org/graphql-js/mutations-and-input-types/).

When using `GQLoom`, we usually only use the `object` type, and behind the scenes `GQLoom` will automatically convert the `object` type to the `input` type.
The advantage of this is that we can use the `object` type directly to define input parameters without having to define the `input` type manually.
However, when we use the same `object` type for both `type` and `input`, it will not be woven into GraphQL Schema due to naming conflict.

Let's look at an example:

::: code-group
```ts twoslash [valibot]
import { resolver, mutation, weave } from '@gqloom/core'
import { ValibotWeaver } from '@gqloom/valibot'
import * as v from "valibot"

const Cat = v.object({
  __typename: v.nullish(v.literal("Cat")),
  name: v.string(),
  birthDate: v.string(),
})

const catResolver = resolver({
  createCat: mutation(Cat, {
    input: {
      data: Cat,
    },
    resolve: ({ data }) => data,
  }),
})

export const schema = weave(ValibotWeaver, catResolver);
```
```ts twoslash [zod]
import { resolver, mutation, weave } from '@gqloom/zod'
import { ZodWeaver } from '@gqloom/zod'
import { z } from "zod"

const Cat = z.object({
  __typename: z.literal("Cat").nullish(),
  name: z.string(),
  birthDate: z.string(),
})

const catResolver = resolver({
  createCat: mutation(Cat, {
    input: {
      data: Cat,
    },
    resolve: ({ data }) => data,
  }),
})

export const schema = weave(ZodWeaver, catResolver);
```
:::

In the above code, we defined a `Cat` object and used it for `type` and `input`. But when we try to weave `catResolver` into the GraphQL Schema, an error is thrown with a duplicate `Cat` name:
```bash
Error: Schema must contain uniquely named types but contains multiple types named "Cat".
```

To solve this problem, we need to specify a different name for the `input` type. We can do this using the `getInputObjectName` option in the `SchemaWeaver.config` configuration:

::: code-group
```ts twoslash
import { resolver, mutation, weave, GraphQLSchemaLoom } from '@gqloom/core'
import { ValibotWeaver } from '@gqloom/valibot'
import * as v from "valibot"

const Cat = v.object({
  __typename: v.nullish(v.literal("Cat")),
  name: v.string(),
  birthDate: v.string(),
})

const catResolver = resolver({
  createCat: mutation(Cat, {
    input: {
      data: Cat,
    },
    resolve: ({ data }) => data,
  }),
})

export const schema = weave(
  catResolver,
  ValibotWeaver,
  GraphQLSchemaLoom.config({ getInputObjectName: (name) => `${name}Input` }) // [!code hl]
)
```
```ts twoslash
import { resolver, mutation, weave, GraphQLSchemaLoom } from '@gqloom/zod'
import { z } from "zod"

const Cat = z.object({
  __typename: z.literal("Cat").nullish(),
  name: z.string(),
  birthDate: z.string(),
})

const catResolver = resolver({
  createCat: mutation(Cat, {
    input: {
      data: Cat,
    },
    resolve: ({ data }) => data,
  }),
})

export const schema = weave(
  catResolver,
  GraphQLSchemaLoom.config({ getInputObjectName: (name) => `${name}Input` }) // [!code hl]
)
```
:::

Thus, `Cat` objects will be converted to `CatInput` types, thus avoiding naming conflicts.

The above `catResolver` will weave the following GraphQL Schema:
```graphql title="GraphQL Schema"
type Mutation {
  createCat(data: CatInput!): Cat!
}

type Cat {
  name: String!
  birthDate: String!
}

input CatInput {
  name: String!
  birthDate: String!
}
```

## Global middleware

```ts
import { weave } from '@gqloom/core';
import { logger } from './middlewares';

export const schema = weave(helloResolver, catResolver, logger)
```
See more about middleware usage in [middleware section](./middleware).