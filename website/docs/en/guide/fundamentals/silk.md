# Silk

The full name of `GQLoom` is GraphQL Loom.

The silk is the basic material of the loom, and it reflects both GraphQL types and TypeScript types.
At development time, we use the Schema of an existing schema library as the thread, and eventually `GQLoom` will weave the silk into the GraphQL Schema.

## Simple scalar silk

We can create a simple scalar silk using the `silk` function:

```ts
import { silk } from "@gqloom/core"
import { GraphQLString, GraphQLInt } from "graphql"

const StringSilk = silk(GraphQLString)
const IntSilk = silk(GraphQLInt)

const NonNullStringSilk = silk(new GraphQLNonNull(GraphQLString))
const NonNullStringSilk_1 = silk.nonNull(StringSilk)
```

## Object silk

We can construct GraphQL objects directly using [graphql.js](https://graphql.org/graphql-js/constructing-types/):

```ts
import { silk } from "@gqloom/core"
import {
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLInt,
} from "graphql"

interface ICat {
  name: string
  age: number
}

const Cat = silk<ICat>(
  new GraphQLObjectType({
    name: "Cat",
    fields: {
      name: { type: new GraphQLNonNull(GraphQLString) },
      age: { type: new GraphQLNonNull(GraphQLInt) },
    },
  })
)
```

In the above code: we define an `ICat` interface and a silk named `Cat` using the `silk` function.
The `silk` function accepts `ICat` as a generic parameter and also accepts a `GraphQLObjectType` instance to elaborate the structure of `Cat` in GraphQL.

`Cat` will be presented in GraphQL as:

```graphql
type Cat {
  name: String!
  age: Int!
}
```

You may have noticed that using `graphql.js` to create silk requires the declaration of both the `ICat` interface and the `GraphQLObjectType`, which means that we have created two definitions for `Cat`.
Duplicate definitions cost the code simplicity and increased maintenance costs.

## Creating silk with schema libraries

The good thing is that we have schema libraries like [Valibot](https://valibot.dev/), [Zod](https://zod.dev/) that create Schemas that will carry TypeScript types and remain typed at runtime.
`GQLoom` can use these Schemas directly as silks without duplicating definitions.

### Use [Valibot](https://valibot.dev/) to create silk:

```ts
import * as v from "valibot"
import { valibotSilk } from "@gqloom/valibot"

const StringSilk = valibotSilk(v.string())

const BooleanSilk = valibotSilk(v.boolean())

const Cat = valibotSilk(
  v.object({
    __typename: v.literal("Cat"),
    name: v.string(),
    age: v.number(),
  })
)
```

In the code above, we have created some simple Schema as silk using [Valibot](https://valibot.dev/), you can learn how to create more complex types using [Valibot integration](../schema-integration/valibot) section to learn how to create more complex types using [Valibot](https://valibot.dev/).

### Use [Zod](https://zod.dev/) to create silk:

```ts
import { z } from "zod"
import { zodSilk } from "@gqloom/zod"

const StringSilk = zodSilk(z.string())

const BooleanSilk = zodSilk(z.boolean())

const Cat = zodSilk(
  z.object({
    __typename: z.literal("Cat"),
    name: z.string(),
    age: z.number(),
  })
)
```

In the code above, we have created some simple Schema as silk using [Zod](https://zod.dev/), you can learn how to create more complex types using [Zod integration](../schema-integration/zod) section to learn how to create more complex types using [Zod](https://zod.dev/).
