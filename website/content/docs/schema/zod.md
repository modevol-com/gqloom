---
title: Zod
---

[Zod](https://zod.dev/) is a TypeScript-first schema declaration and validation library. I'm using the term "schema" to broadly refer to any data type, from a simple string to a complex nested object.

Zod is designed to be as developer-friendly as possible. The goal is to eliminate duplicative type declarations. With Zod, you declare a validator once and Zod will automatically infer the static TypeScript type. It's easy to compose simpler types into complex data structures.

`@gqloom/zod` provides integration of GQLoom with Zod to weave Zod Schema into GraphQL Schema.

## Installation

```sh tab="npm"
npm i @gqloom/core zod @gqloom/zod
```
```sh tab="pnpm"
pnpm add @gqloom/core zod @gqloom/zod
```
```sh tab="yarn"
yarn add @gqloom/core zod @gqloom/zod
```
```sh tab="bun"
bun add @gqloom/core zod @gqloom/zod
```

## Defining simple scalars

In GQLoom, you can directly use Zod Schema as [silk](../fundamentals/silk).

```ts twoslash
import { z } from "zod"

const StringScalar = z.string() // GraphQLString

const BooleanScalar = z.boolean() // GraphQLBoolean

const FloatScalar = z.number() // GraphQLFloat

const IntScalar = z.number().int() // GraphQLInt
```

## Weave

To ensure that `GQLoom` correctly weaves the Zod Schema into the GraphQL Schema, we need to add the `ZodWeaver` from `@gqloom/zod` when using the `weave` function.

```ts twoslash
import { ZodWeaver, weave, resolver, query } from "@gqloom/zod"
import { z } from "zod"

export const helloResolver = resolver({
  hello: query(z.string(), () => "Hello, World!"),
})

export const schema = weave(ZodWeaver, helloResolver)
```

## Defining Objects

We can define objects using Zod and use them as [silk](../fundamentals/silk) to use:
```ts twoslash
import { z } from "zod"
import { collectNames } from "@gqloom/zod"

export const Cat = z.object({
  name: z.string(),
  age: z.number().int(),
  loveFish: z.boolean().nullish(),
})

collectNames({ Cat })
```

## Names and more data

### Defining names for objects

In `GQLoom` we have multiple ways to define names for objects.

#### Using `__typename` literal
```ts twoslash
import { z } from "zod"

export const Cat = z.object({
  __typename: z.literal("Cat").nullish(),
  name: z.string(),
  age: z.number().int(),
  loveFish: z.boolean().nullish(),
})
```
In the code above, we used the `__typename` literal to define the name for the object. We also set the `__typename` literal to `nullish`, which means that the `__typename` field is optional, and if it exists, it must be “Cat”.

```ts twoslash
import { z } from "zod"

export const Cat = z.object({
  __typename: z.literal("Cat"),
  name: z.string(),
  age: z.number().int(),
  loveFish: z.boolean().nullish(),
})
```
In the code above we are still using the `__typename` literal to define the name for the object, but this time we are setting the `__typename` literal to “Cat”, which means that the `__typename` field is mandatory and must be “Cat”, which will be very useful when using the GraphQL `interface` and `union` The required `__typename` will be very useful when using GraphQL `interface` and `union`.

#### Using `collectNames`

```ts twoslash
import { z } from "zod"
import { collectNames } from "@gqloom/zod"

export const Cat = z.object({
  name: z.string(),
  age: z.number().int(),
  loveFish: z.boolean().nullish(),
})

collectNames({ Cat })
```

In the above code, we are using the `collectNames` function to define names for objects. The `collectNames` function accepts an object whose key is the name of the object and whose value is the object itself.

```ts twoslash
import { z } from "zod"
import { collectNames } from "@gqloom/zod"

export const { Cat } = collectNames({
  Cat: z.object({
    name: z.string(),
    age: z.number().int(),
    loveFish: z.boolean().nullish(),
  }),
})
```
In the code above, we use the `collectNames` function to define the names for the objects and deconstruct the returned objects into `Cat` and export them.

#### Using `asObjectType`
```ts twoslash
import { z } from "zod"
import { asObjectType } from "@gqloom/zod"

export const Cat = z
  .object({
    name: z.string(),
    age: z.number().int(),
    loveFish: z.boolean().nullish(),
  })
  .superRefine(asObjectType({ name: "Cat" }))
```

In the code above, we used the `asObjectType` function to create a metadata and pass it into `superRefine()` to define a name for the object. The `asObjectType` function takes the complete GraphQL object type definition and returns a metadata.

### Add more metadata

With the `asObjectType` function, we can add more data to the object, such as `description`, `deprecationReason`, `extensions` and so on.

```ts twoslash
import { z } from "zod"
import { asObjectType } from "@gqloom/zod"

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

In the above code, we have added a `description` metadata to the `Cat` object which will be presented in the GraphQL Schema:
```graphql
"""A cute cat"""
type Cat {
  name: String!
  age: Int!
  loveFish: Boolean
}
```

We can also use the asField function to add metadata to a field, such as description, type, and so on.
```ts twoslash
import { z } from "zod"
import { asField, asObjectType } from "@gqloom/zod"
import { GraphQLInt } from "graphql"

export const Cat = z
  .object({
    name: z.string(),
    age: z
      .number()
      .superRefine(
        asField({ type: GraphQLInt, description: "How old is the cat" })
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

In the above code, we added `type` and `description` metadata to the `age` field and ended up with the following GraphQL Schema:

```graphql
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
```ts twoslash
import { z } from "zod"
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
  .superRefine(asObjectType({ name: "Orange", interfaces: [Fruit] }))
```
In the above code, we created an interface `Fruit` using the `asObjectType` function and declared the `Orange` object as an implementation of the `Fruit` interface using the `interfaces` option.

#### Omitting Fields

We can also omit fields by setting `type` to `null` using the `asField` function, for example:
```ts twoslash
import { z } from "zod"
import { asField } from "@gqloom/zod"

const Dog = z.object({
  __typename: z.literal("Dog").nullish(),
  name: z.string().nullish(),
  birthday: z
    .date()
    .nullish()
    .superRefine(asField({ type: null })),
})
```
The following GraphQL Schema will be generated:
```graphql
type Dog {
  name: String
}
```

## Defining Union Types

#### Using z.discriminatedUnion

We recommend using `z.discriminatedUnion` to define union types, for example:
```ts twoslash
import { z } from "zod"
import { asUnionType } from "@gqloom/zod"

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
In the above code, we have created a union type using the `z.discriminatedUnion` function. In the case of `Animal`, it distinguishes the specific type by the `__typename` field.

#### Using z.union

We can also use `z.union` to define union types:

```ts twoslash
import { z } from "zod"
import { asUnionType, collectNames } from "@gqloom/zod"

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
In the above code, we have created a union type using the `z.union` function. For `Animal`, we use the `resolveType` function to differentiate between specific types.
Here, if an animal likes fish, then it is a cat, otherwise it is a dog.

## Defining Enumeration Types

We can define enum types using `z.enum` or `z.nativeEnum`.

#### Using z.enum

In general, we prefer to use `z.enum` to define enumeration types, for example:
```ts twoslash
import { z } from "zod"
import { asEnumType } from "@gqloom/zod"

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

#### Using z.nativeEnum

We can also use `z.nativeEnum` to define enumeration types, for example:
```ts twoslash
import { z } from "zod"
import { asEnumType } from "@gqloom/zod"

enum FruitEnum {
  apple,
  banana,
  orange,
}

export const Fruit = z.nativeEnum(FruitEnum).superRefine(
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

## Customize Type Mappings

To accommodate more Zod types, we can extend GQLoom to add more type mappings to it.

First we use `ZodWeaver.config` to define the type mapping configuration. Here we import the `GraphQLDateTime`, `GraphQLJSON` and `GraphQLJSONObject` scalars from [graphql-scalars](https://the-guild.dev/graphql/scalars) and map them to the matching GraphQL scalars when encountering the `date`, `any` and `record` types.

```ts twoslash
import {
  GraphQLDateTime,
  GraphQLJSON,
  GraphQLJSONObject,
} from "graphql-scalars"
import { z } from "zod"
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
import { z } from "zod"
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
| `z.literal(0)`           | `GraphQLInt`        |
| `z.number()`             | `GraphQLFloat`      |
| `z.number().int()`       | `GraphQLFloat`      |
| `z.boolean()`            | `GraphQLBoolean`    |
| `z.object()`             | `GraphQLObjectType` |
| `z.enum()`               | `GraphQLEnumType`   |
| `z.nativeEnum()`         | `GraphQLEnumType`   |
| `z.union()`              | `GraphQLUnionType`  |
| `z.discriminatedUnion()` | `GraphQLUnionType`  |