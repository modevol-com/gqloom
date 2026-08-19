<script setup>
import { Tabs } from "@/components/tabs.tsx"
</script>

# Silk

The silk is the basic material of the GraphQL Loom, and it reflects both GraphQL types and TypeScript types.
At development time, we use the Schema of an existing schema library as the silk, and eventually `GQLoom` will weave the silk into the GraphQL Schema.

## Simple scalar silk

We can create a simple scalar silk using the `silk` function:

```ts twoslash
import { silk } from "@gqloom/core"
import { GraphQLString, GraphQLInt, GraphQLNonNull } from "graphql"

const StringSilk = silk(GraphQLString)
const IntSilk = silk(GraphQLInt)

const NonNullStringSilk = silk(new GraphQLNonNull(GraphQLString))
const NonNullStringSilk1 = silk.nonNull(StringSilk)
```

## Object silk

We can construct GraphQL objects directly using [graphql.js](https://graphql.org/graphql-js/constructing-types/):

```ts twoslash
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

const Cat = silk(
  new GraphQLObjectType<ICat>({
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

```graphql title="GraphQL Schema"
type Cat {
  name: String!
  age: Int!
}
```

You may have noticed that using `graphql.js` to create silk requires the declaration of both the `ICat` interface and the `GraphQLObjectType`, which means that we have created two definitions for `Cat`.
Duplicate definitions cost the code simplicity and increased maintenance costs.

## Creating silk using Schema libraries

Fortunately, we have Schema libraries like [Valibot](https://valibot.dev/) and [Zod](https://zod.dev/) that create Schemas that carry TypeScript types and still carry types at runtime.
`GQLoom` can directly use these Schemas as silk without duplicate definitions.

`GQLoom` currently integrates Schemas from the following libraries:

- [Valibot](./schema/valibot.md)
- [Zod](./schema/zod.md)
- [JSON Schema](./schema/json.md)
- [Yup](./schema/yup.md)
- [Effect Schema](./schema/effect.md)
- [Mikro ORM](./schema/mikro-orm.md)
- [Drizzle](./schema/drizzle.md)
- [Prisma](./schema/prisma.md)

Additionally, there are some libraries that can be used as silk through JSON Schema, such as [TypeBox](https://sinclairzx81.github.io/typebox/), [ArkType](https://arktype.io/) etc.

<Tabs groupId="schema-library">
<template #Valibot>

```ts twoslash
import * as v from "valibot"

const StringSilk = v.string()

const BooleanSilk = v.boolean()

const Cat = v.object({
  __typename: v.literal("Cat"),
  name: v.string(),
  age: v.number(),
})
```

We can directly use Valibot Schema as silk, but don't forget to add `ValibotWeaver` from `@gqloom/valibot` when [weaving](./weave.md).

```ts twoslash
import { type Loom } from "@gqloom/core"
const resolvers: Loom.Resolver[] = []
// ---cut---
import { weave } from "@gqloom/core"
import { ValibotWeaver } from "@gqloom/valibot"

export const schema = weave(ValibotWeaver, ...resolvers)
```

</template>
<template #Zod>

```ts twoslash
import * as z from "zod"

const StringSilk = z.string()

const BooleanSilk = z.boolean()

const Cat = z.object({
  __typename: z.literal("Cat"),
  name: z.string(),
  age: z.number(),
})
```

We can directly use Zod Schema as silk, but don't forget to add `ZodWeaver` from `@gqloom/zod` when [weaving](./weave.md).

```ts twoslash
import { type Loom } from "@gqloom/core"
const resolvers: Loom.Resolver[] = []
// ---cut---
import { weave } from "@gqloom/core"
import { ZodWeaver } from "@gqloom/zod"

export const schema = weave(ZodWeaver, ...resolvers)
```

</template>
<template #JSON_Schema>

We need to use the `jsonSilk` function from `@gqloom/json` to use JSON Schema as silk:

```ts twoslash
import { jsonSilk } from "@gqloom/json"

const StringSilk = jsonSilk({ type: "string" })

const BooleanSilk = jsonSilk({ type: "boolean" })

const Cat = jsonSilk({
  title: "Cat",
  type: "object",
})
```

</template>
<template #Yup>

```ts twoslash
import * as yup from "yup"

const StringSilk = yup.string()
const BooleanSilk = yup.boolean()
const Cat = yup.object({
  name: yup.string(),
  age: yup.number(),
}).label("Cat")
```

We can directly use Yup Schema as silk, but don't forget to add `YupWeaver` from `@gqloom/yup` when [weaving](./weave.md).

```ts twoslash
import { type Loom } from "@gqloom/core"
const resolvers: Loom.Resolver[] = []
// ---cut---
import { weave } from "@gqloom/core"
import { YupWeaver } from "@gqloom/yup"

export const schema = weave(YupWeaver, ...resolvers)
```

</template>
<template #TypeBox>

To use TypeBox Schema as silk, we need to define a wrapper function for TypeBox Schema using `@gqloom/json`:

```ts twoslash
import { type GraphQLSilk } from "@gqloom/core"
import { JSONWeaver } from "@gqloom/json"
import { type Static, type Type } from "typebox"

function typeSilk<T extends Type.TSchema>(
  type: T
): T & GraphQLSilk<Type.Static<T>, Type.Static<T>> {
  return JSONWeaver.unravel(type) as T &
    GraphQLSilk<Type.Static<T>, Type.Static<T>>
}
```

Then we can use the `typeSilk` function to use TypeBox Schema as silk:

```ts twoslash
import { type GraphQLSilk } from "@gqloom/core"
import { JSONWeaver } from "@gqloom/json"
import { type TSchema, type Static } from "typebox"

function typeSilk<T extends Type.TSchema>(
  type: T
): T & GraphQLSilk<Type.Static<T>, Type.Static<T>> {
  return JSONWeaver.unravel(type) as T &
    GraphQLSilk<Type.Static<T>, Type.Static<T>>
}
// ---cut---
import { Type } from "typebox"

const StringSilk = typeSilk(Type.String())

const BooleanSilk = typeSilk(Type.Boolean())

const Cat = typeSilk(Type.Object({ 
  __typename: Type.Optional(Type.Literal("Cat")),
  name: Type.String(), 
  age: Type.Integer(),
}))
```

</template>
<template #ArkType>

```ts twoslash
import { type } from "arktype"

const StringSilk = type("string")

const BooleanSilk = type("boolean")

const Cat = type({
  "__typename?": "'Cat' | null",
  name: "string",
  age: "number",
})
```

We need to use `@gqloom/json` to create a custom `arkTypeWeaver` to use ArkType's Schema as silk:

```ts twoslash
import { type Loom } from "@gqloom/core"
const resolvers: Loom.Resolver[] = []
// ---cut---
import { type SchemaWeaver, weave } from "@gqloom/core"
import { type JSONSchema, JSONWeaver } from "@gqloom/json"
import { type Type } from "arktype"

const arkTypeWeaver: SchemaWeaver = {
  vendor: "arktype",
  getGraphQLType: (type: Type) => {
    return JSONWeaver.getGraphQLType(type.toJsonSchema() as JSONSchema, {
      source: type,
    })
  },
}

export const schema = weave(arkTypeWeaver, ...resolvers)
```

</template>
<template #Effect_Schema>

```ts twoslash
import { Schema } from "effect"

const StringSilk = Schema.standardSchemaV1(Schema.String)

const BooleanSilk = Schema.standardSchemaV1(Schema.Boolean)

const Cat = Schema.standardSchemaV1(Schema.Struct({
  name: Schema.String,
  age: Schema.Int,
}).annotations({ title: "Cat" }))
```

We can directly use Effect Schema as silk, but don't forget to add `EffectWeaver` from `@gqloom/effect` when [weaving](./weave.md):

```ts twoslash
import { type Loom } from "@gqloom/core"
const resolvers: Loom.Resolver[] = []
// ---cut---
import { weave } from "@gqloom/core"
import { EffectWeaver } from "@gqloom/effect"

export const schema = weave(EffectWeaver, ...resolvers)
```
</template>
</Tabs>