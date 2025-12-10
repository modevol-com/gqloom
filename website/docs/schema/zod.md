<script setup lang="ts">
import { Tabs } from '@/components/tabs'
</script>

# Zod

[Zod](https://zod.dev/) is a TypeScript-first schema declaration and validation library. I'm using the term "schema" to broadly refer to any data type, from a simple string to a complex nested object.

Zod is designed to be as developer-friendly as possible. The goal is to eliminate duplicative type declarations. With Zod, you declare a validator once and Zod will automatically infer the static TypeScript type. It's easy to compose simpler types into complex data structures.

`@gqloom/zod` provides integration of GQLoom with Zod to weave Zod Schema into GraphQL Schema.

## Installation

<!--@include: @/snippets/install-zod.md-->

## Defining simple scalars

In GQLoom, you can directly use Zod Schema as [silk](../silk).

```ts twoslash
import * as z from "zod"

const StringScalar = z.string() // GraphQLString

const BooleanScalar = z.boolean() // GraphQLBoolean

const FloatScalar = z.number() // GraphQLFloat

const IntScalar = z.int() // GraphQLInt
```

## Weave

To ensure that `GQLoom` correctly weaves the Zod Schema into the GraphQL Schema, we need to add the `ZodWeaver` from `@gqloom/zod` when using the `weave` function.

```ts twoslash
import { ZodWeaver, weave, resolver, query } from "@gqloom/zod"
import * as z from "zod"

export const helloResolver = resolver({
  hello: query(z.string(), () => "Hello, World!"),
})

export const schema = weave(ZodWeaver, helloResolver)
```

## Defining Objects

We can define objects using Zod and use them as [silk](../silk) to use:

```ts twoslash
import * as z from "zod"

export const Cat = z.object({
  __typename: z.literal("Cat").nullish(),
  name: z.string(),
  age: z.int(),
  loveFish: z.boolean().nullish(),
})
```

## Names and more metadata

### Defining names for objects

<!--@include: ./parts/naming.info.md-->

The recommended practice is to use the `__typename` literal to define a name for the object, for example:

```ts twoslash
import * as z from "zod"

export const Cat = z.object({
  __typename: z.literal("Cat").nullish(),
  name: z.string(),
  age: z.int(),
  loveFish: z.boolean().nullish(),
})
```

We can also use the required `__typename` literal to set a specific value, which is very useful when using GraphQL `interface` and `union`, for example:

```ts twoslash
import * as z from "zod"

export const Cat = z.object({
  __typename: z.literal("Cat"),
  name: z.string(),
  age: z.int(),
  loveFish: z.boolean().nullish(),
})
```

::: details Using `collectNames`

```ts twoslash
import * as z from "zod"
import { collectNames } from "@gqloom/core"

export const Cat = z.object({
  name: z.string(),
  age: z.int(),
  loveFish: z.boolean().nullish(),
})

collectNames({ Cat })
```

We can also use the `collectNames` function to define names for objects and deconstruct the returned objects into `Cat` and export them.

```ts twoslash
import * as z from "zod"
import { collectNames } from "@gqloom/core"

export const { Cat } = collectNames({
  Cat: z.object({
    name: z.string(),
    age: z.int(),
    loveFish: z.boolean().nullish(),
  }),
})
```

:::

::: details Using `asObjectType`

We can use the `asObjectType` function to create metadata and pass it into the `Zod` pipeline to define a name for the object. The `asObjectType` function takes the complete GraphQL object type definition and returns metadata.

<Tabs groupId="zod-version">
<template #zod-v4>

```ts twoslash
import { asObjectType } from "@gqloom/zod"
import * as z from "zod/v4"

export const Cat = z
  .object({
    name: z.string(),
    age: z.int(),
    loveFish: z.boolean().nullish(),
  })
  .register(asObjectType, { name: "Cat" })
```

</template>
<template #zod-v3>

```ts twoslash
import { asObjectType } from "@gqloom/zod/v3"
import * as z from "zod/v3"

export const Cat = z
  .object({
    name: z.string(),
    age: z.number().int(),
    loveFish: z.boolean().nullish(),
  })
  .superRefine(asObjectType({ name: "Cat" }))
```

</template>
</Tabs>

:::

### Adding more metadata

With the `asObjectType` register, we can add more metadata to the object, such as `description`, `deprecationReason`, `extensions` and so on.

<Tabs groupId="zod-version">
<template #zod-v4>

```ts twoslash
import { asObjectType } from "@gqloom/zod"
import * as z from "zod/v4"

export const Cat = z
  .object({
    name: z.string(),
    age: z.int(),
    loveFish: z.boolean().nullish(),
  })
  .register(asObjectType, {
    name: "Cat",
    description: "A cute cat",
  })
```

</template>
<template #zod-v3>

```ts twoslash
import { asObjectType } from "@gqloom/zod/v3"
import * as z from "zod/v3"

export const Cat = z
  .object({
    name: z.string(),
    age: z.number().int(),
    loveFish: z.boolean().nullish(),
  })
  .superRefine(
    asObjectType({
      name: "Cat",
      description: "A cute cat",
    })
  )
```

</template>
</Tabs>

In the above code, we have added a `description` metadata to the `Cat` object which will be presented in the GraphQL Schema:

```graphql title="GraphQL Schema"
"""A cute cat"""
type Cat {
  name: String!
  age: Int!
  loveFish: Boolean
}
```

We can also use the asField function to add metadata to a field, such as description, type, and so on.

<Tabs groupId="zod-version">
<template #zod-v4>

```ts twoslash
import { asField, asObjectType } from "@gqloom/zod"
import { GraphQLInt } from "graphql"
import * as z from "zod/v4"

export const Cat = z
  .object({
    name: z.string(),
    age: z.number().register(asField, { // [!code highlight]
      type: GraphQLInt, // [!code highlight]
      description: "How old is the cat", // [!code highlight]
      extensions: { // [!code highlight]
        complexity: 2, // [!code highlight]
      }, // [!code highlight]
    }), // [!code highlight]
    loveFish: z.boolean().nullish(),
  })
  .register(asObjectType, {
    name: "Cat",
    description: "A cute cat",
  })
```

</template>
<template #zod-v3>

```ts twoslash
import { asField, asObjectType } from "@gqloom/zod/v3"
import { GraphQLInt } from "graphql"
import * as z from "zod/v3"

export const Cat = z
  .object({
    name: z.string(),
    age: z
      .number()
      .superRefine(
        asField({ // [!code highlight]
          type: GraphQLInt, // [!code highlight]
          description: "How old is the cat", // [!code highlight]
          extensions: { // [!code highlight]
            complexity: 2, // [!code highlight]
          }, // [!code highlight]
        })
      ),
    loveFish: z.boolean().nullish(),
  })
  .superRefine(
    asObjectType({
      name: "Cat",
      description: "A cute cat",
    })
  )
```

</template>
</Tabs>

In the above code, we added `type` and `description` metadata to the `age` field and ended up with the following GraphQL Schema:

```graphql title="GraphQL Schema"
"""A cute cat"""
type Cat {
  name: String!

  """How old is the cat"""
  age: Int
  loveFish: Boolean
}
```

#### Declaring Interfaces

We can also use the `asObjectType` function to declare interfaces, for example:

<Tabs groupId="zod-version">
<template #zod-v4>

```ts twoslash
import * as z from "zod/v4"
import { asObjectType } from "@gqloom/zod"

const Fruit = z
  .object({
    __typename: z.literal("Fruit").nullish(),
    name: z.string(),
    color: z.string(),
    prize: z.number(),
  })
  .describe("Some fruits you might like")

const Orange = z
  .object({
    name: z.string(),
    color: z.string(),
    prize: z.number(),
  })
  .register(asObjectType, { name: "Orange", interfaces: [Fruit] })
```

</template>
<template #zod-v3>

```ts twoslash
import { asObjectType } from "@gqloom/zod/v3"
import * as z from "zod/v3"

const Fruit = z
  .object({
    __typename: z.literal("Fruit").nullish(),
    name: z.string(),
    color: z.string(),
    prize: z.number(),
  })
  .describe("Some fruits you might like")

const Orange = z
  .object({
    name: z.string(),
    color: z.string(),
    prize: z.number(),
  })
  .superRefine(asObjectType({ name: "Orange", interfaces: [Fruit] }))
```

</template>
</Tabs>

In the above code, we created an interface `Fruit` using the `asObjectType` function and declared the `Orange` object as an implementation of the `Fruit` interface using the `interfaces` option.

#### Omitting Fields

We can also omit fields by setting `type` to `null` using the `asField` function, for example:

<Tabs groupId="zod-version">
<template #zod-v4>

```ts twoslash
import { asField } from "@gqloom/zod"
import * as z from "zod/v4"

const Dog = z.object({
  __typename: z.literal("Dog").nullish(),
  name: z.string().nullish(),
  birthday: z.date().nullish().register(asField, { type: null }),
})
```

</template>
<template #zod-v3>

```ts twoslash
import { asField } from "@gqloom/zod/v3"
import * as z from "zod/v3"

const Dog = z.object({
  __typename: z.literal("Dog").nullish(),
  name: z.string().nullish(),
  birthday: z
    .date()
    .nullish()
    .superRefine(asField({ type: null })),
})
```

</template>
</Tabs>

The following GraphQL Schema will be generated:

```graphql title="GraphQL Schema"
type Dog {
  name: String
}
```

## Defining Union Types

#### Using z.discriminatedUnion

We recommend using `z.discriminatedUnion` to define union types, for example:

<Tabs groupId="zod-version">
<template #zod-v4>

```ts twoslash
import { asUnionType } from "@gqloom/zod"
import { z } from "zod/v4"

const Cat = z.object({
  __typename: z.literal("Cat"),
  name: z.string(),
  age: z.number(),
  loveFish: z.boolean().optional(),
})

const Dog = z.object({
  __typename: z.literal("Dog"),
  name: z.string(),
  age: z.number(),
  loveBone: z.boolean().optional(),
})

const Animal = z
  .discriminatedUnion("__typename", [Cat, Dog])
  .register(asUnionType, { name: "Animal" })
```

</template>
<template #zod-v3>

```ts twoslash
import { asUnionType } from "@gqloom/zod/v3"
import * as z from "zod/v3"

const Cat = z.object({
  __typename: z.literal("Cat"),
  name: z.string(),
  age: z.number(),
  loveFish: z.boolean().optional(),
})

const Dog = z.object({
  __typename: z.literal("Dog"),
  name: z.string(),
  age: z.number(),
  loveBone: z.boolean().optional(),
})

const Animal = z
  .discriminatedUnion("__typename", [Cat, Dog])
  .superRefine(asUnionType("Animal"))
```

</template>
</Tabs>

In the above code, we have created a union type using the `z.discriminatedUnion` function. In the case of `Animal`, it distinguishes the specific type by the `__typename` field.

#### Using z.union

We can also use `z.union` to define union types:

<Tabs groupId="zod-version">
<template #zod-v4>

```ts twoslash
import { z } from "zod/v4"
import { collectNames } from "@gqloom/core"
import { asUnionType } from "@gqloom/zod"

const Cat = z.object({
  name: z.string(),
  age: z.number(),
  loveFish: z.boolean().optional(),
})

const Dog = z.object({
  name: z.string(),
  age: z.number(),
  loveBone: z.boolean().optional(),
})

const Animal = z.union([Cat, Dog]).register(asUnionType, {
  name: "Animal",
  resolveType: (it) => (it.loveFish ? "Cat" : "Dog"),
})

collectNames({ Cat, Dog, Animal })
```

</template>
<template #zod-v3>

```ts twoslash
import { collectNames } from "@gqloom/core"
import { asUnionType } from "@gqloom/zod/v3"
import * as z from "zod/v3"

const Cat = z.object({
  name: z.string(),
  age: z.number(),
  loveFish: z.boolean().optional(),
})

const Dog = z.object({
  name: z.string(),
  age: z.number(),
  loveBone: z.boolean().optional(),
})

const Animal = z.union([Cat, Dog]).superRefine(
  asUnionType({
    name: "Animal",
    resolveType: (it) => (it.loveFish ? "Cat" : "Dog"),
  })
)

collectNames({ Cat, Dog, Animal })
```

</template>
</Tabs>

In the above code, we have created a union type using the `z.union` function. For `Animal`, we use the `resolveType` function to differentiate between specific types.
Here, if an animal likes fish, then it is a cat, otherwise it is a dog.

## Defining Enumeration Types

We can define enum types using `z.enum` or `z.nativeEnum`.

#### Using z.enum

In general, we prefer to use `z.enum` to define enumeration types, for example:

<Tabs groupId="zod-version">
<template #zod-v4>

```ts twoslash
import { asEnumType } from "@gqloom/zod"
import * as z from "zod/v4"

export const Fruit = z
  .enum(["apple", "banana", "orange"])
  .register(asEnumType, {
    name: "Fruit",
    valuesConfig: {
      apple: { description: "red" },
      banana: { description: "yellow" },
      orange: { description: "orange" },
    },
  })

export type IFruit = z.infer<typeof Fruit>
```

</template>
<template #zod-v3>

```ts twoslash
import { asEnumType } from "@gqloom/zod/v3"
import * as z from "zod/v3"

export const Fruit = z.enum(["apple", "banana", "orange"]).superRefine(
  asEnumType({
    name: "Fruit",
    valuesConfig: {
      apple: { description: "red" },
      banana: { description: "yellow" },
      orange: { description: "orange" },
    },
  })
)

export type IFruit = z.infer<typeof Fruit>
```

</template>
</Tabs>

## Customize Type Mappings

To accommodate more Zod types, we can extend GQLoom to add more type mappings to it.

First we use `ZodWeaver.config` to define the type mapping configuration.   
Here we import the `GraphQLDateTime`, `GraphQLJSON` and `GraphQLJSONObject` scalars from [graphql-scalars](https://the-guild.dev/graphql/scalars) and map them to the matching GraphQL scalars when encountering the `date`, `any` and `record` types.

```ts twoslash
import {
  GraphQLDateTime,
  GraphQLJSON,
  GraphQLJSONObject,
} from "graphql-scalars"
import * as z from "zod"
import { ZodWeaver } from "@gqloom/zod"

export const zodWeaverConfig = ZodWeaver.config({
  presetGraphQLType: (schema) => {
    if (schema instanceof z.ZodDate) return GraphQLDateTime

    if (schema instanceof z.ZodAny) return GraphQLJSON

    if (schema instanceof z.ZodRecord) return GraphQLJSONObject
  },
})
```

Configurations are passed into the `weave` function when weaving the GraphQL Schema:

```ts twoslash
import {
  GraphQLDateTime,
  GraphQLJSON,
  GraphQLJSONObject,
} from "graphql-scalars"
import * as z from "zod"
import { resolver } from '@gqloom/core'
import { ZodWeaver } from "@gqloom/zod"

export const zodWeaverConfig = ZodWeaver.config({
  presetGraphQLType: (schema) => {
    if (schema instanceof z.ZodDate) return GraphQLDateTime

    if (schema instanceof z.ZodAny) return GraphQLJSON

    if (schema instanceof z.ZodRecord) return GraphQLJSONObject
  },
})

export const helloResolver = resolver({})
// ---cut---
import { weave } from "@gqloom/zod"

export const schema = weave(zodWeaverConfig, helloResolver)
```

## Default Type Mappings

The following table lists the default mappings between Zod types and GraphQL types in GQLoom:

| Zod types                | GraphQL types       |
| ------------------------ | ------------------- |
| `z.array()`              | `GraphQLList`       |
| `z.string()`             | `GraphQLString`     |
| `z.string().cuid()`      | `GraphQLID`         |
| `z.string().cuid2()`     | `GraphQLID`         |
| `z.string().ulid()`      | `GraphQLID`         |
| `z.string().uuid()`      | `GraphQLID`         |
| `z.literal("")`          | `GraphQLString`     |
| `z.literal(false)`       | `GraphQLBoolean`    |
| `z.literal(0)`           | `GraphQLFloat`      |
| `z.number()`             | `GraphQLFloat`      |
| `z.int()`                | `GraphQLInt`        |
| `z.boolean()`            | `GraphQLBoolean`    |
| `z.object()`             | `GraphQLObjectType` |
| `z.enum()`               | `GraphQLEnumType`   |
| `z.nativeEnum()`         | `GraphQLEnumType`   |
| `z.union()`              | `GraphQLUnionType`  |
| `z.discriminatedUnion()` | `GraphQLUnionType`  |
