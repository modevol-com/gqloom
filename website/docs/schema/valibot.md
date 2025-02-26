---
title: Valibot
---

# Valibot

[Valibot](https://valibot.dev/) is the open source schema library for TypeScript with bundle size, type safety and developer experience in mind.

`@gqloom/valibot` provides integration of GQLoom with Valibot to weave Valibot Schema into GraphQL Schema.

## Installation

::: code-group
```sh [npm]
npm i @gqloom/core valibot @gqloom/valibot
```
```sh [pnpm]
pnpm add @gqloom/core valibot @gqloom/valibot
```
```sh [yarn]
yarn add @gqloom/core valibot @gqloom/valibot
```
```sh [bun]
bun add @gqloom/core valibot @gqloom/valibot
```
:::

## Defining simple scalars

In GQLoom, you can directly use Valibot schemas as [silk](../silk):

```ts twoslash
import * as v from "valibot"

const StringScalar = v.string() // GraphQLString

const BooleanScalar = v.boolean() // GraphQLBoolean

const FloatScalar = v.number() // GraphQLFloat

const IntScalar = v.pipe(v.number(), v.integer()) // GraphQLInt
```

## Weave

To ensure that `GQLoom` correctly weaves Valibot schemas into the GraphQL schema, we need to add the `ValibotWeaver` from `@gqloom/valibot` when using the `weave` function.

```ts twoslash
import { weave, resolver, query } from "@gqloom/core"
import { ValibotWeaver } from "@gqloom/valibot"
import * as v from "valibot"

export const helloResolver = resolver({
  hello: query(v.string(), () => "Hello, World!"),
})

export const schema = weave(ValibotWeaver, helloResolver)
```

## Defining objects

We can use Valibot to define objects and use them as [silk] (... /silk) to use:

```ts twoslash
import * as v from "valibot"

export const Cat = v.object({
  __typename: v.nullish(v.literal("Cat")),
  name: v.string(),
  age: v.pipe(v.number(), v.integer()),
  loveFish: v.nullish(v.boolean()),
})
```

## Names and more metadata

### Defining names for objects

In `GQLoom` we have multiple ways to define names for objects.

#### Using `__typename` literal

```ts twoslash
import * as v from "valibot"

export const Cat = v.object({
  __typename: v.nullish(v.literal("Cat")),
  name: v.string(),
  age: v.pipe(v.number(), v.integer()),
  loveFish: v.nullish(v.boolean()),
})
```

In the code above, we used the `__typename` literal to define the name for the object. We also set the `__typename` literal to `nullish`, which means that the `__typename` field is optional, and if it exists, it must be “Cat”.

```ts twoslash
import * as v from "valibot"

export const Cat = v.object({
  __typename: v.literal("Cat"),
  name: v.string(),
  age: v.pipe(v.number(), v.integer()),
  loveFish: v.nullish(v.boolean()),
})
```

In the code above, we are still using the `__typename` literal to define the name for the object, but this time we are setting the `__typename` literal to “Cat”, which means that the `__typename` field is required and must be “Cat”. The required `__typename` will be very useful when using GraphQL `interface` and `union`.

#### Using `collectNames`

```ts twoslash
import * as v from "valibot"
import { collectNames } from "@gqloom/core"

export const Cat = v.object({
  name: v.string(),
  age: v.pipe(v.number(), v.integer()),
  loveFish: v.nullish(v.boolean()),
})

collectNames({ Cat }) // Collect names for Cat, which will be presented in the GraphQL Schema after weaving.
```

In the above code, we are using the `collectNames` function to define names for objects. The `collectNames` function accepts an object whose key is the name of the object and whose value is the object itself.

```ts twoslash
import * as v from "valibot"
import { collectNames } from "@gqloom/core"

export const { Cat } = collectNames({
  Cat: v.object({
    name: v.string(),
    age: v.pipe(v.number(), v.integer()),
    loveFish: v.nullish(v.boolean()),
  }),
})
```

In the code above, we use the `collectNames` function to define the names for the objects and deconstruct the returned objects into `Cat` and export them.

#### Using `asObjectType`

```ts twoslash
import * as v from "valibot"
import { asObjectType } from "@gqloom/valibot"

export const Cat = v.pipe(
  v.object({
    name: v.string(),
    age: v.pipe(v.number(), v.integer()),
    loveFish: v.nullish(v.boolean()),
  }),
  asObjectType({ name: "Cat" })
)
```

In the code above, we used the `asObjectType` function to create a metadata and pass it into the `Valibot` pipeline to define a name for the object. The `asObjectType` function takes the complete GraphQL object type definition and returns a metadata.

### Add more data

With the `asObjectType` function, we can add more data to the object, such as `description`, `deprecationReason`, `extensions` and so on.

```ts twoslash
import * as v from "valibot"
import { asObjectType } from "@gqloom/valibot"

export const Cat = v.pipe(
  v.object({
    name: v.string(),
    age: v.pipe(v.number(), v.integer()),
    loveFish: v.nullish(v.boolean()),
  }),
  asObjectType({
    name: "Cat",
    description: "A cute cat",
  })
)
```

In the above code, we have added a `description` metadata to the `Cat` object which will be presented in the GraphQL Schema:

```graphql title="GraphQL Schema"
"""A cute cat"""
type Cat {
  name: String!
  age: Int!
  loveFish: Boolean
}
```

We can also use the `asField` function to add metadata to a field, such as `description`, `type`, and so on.

```ts twoslash
import * as v from "valibot"
import { asObjectType, asField } from "@gqloom/valibot"
import { GraphQLInt } from "graphql"

export const Cat = v.pipe(
  v.object({
    name: v.string(),
    age: v.pipe(
      v.number(),
      asField({ type: GraphQLInt, description: "How old is the cat" })
    ),
    loveFish: v.nullish(v.boolean()),
  }),
  asObjectType({
    name: "Cat",
    description: "A cute cat",
  })
)
```

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

We can use the `asObjectType` function to define interfaces, for example:
```ts twoslash
import * as v from "valibot"
import { asObjectType } from "@gqloom/valibot"

const Fruit = v.object({
  __typename: v.nullish(v.literal("Fruit")),
  name: v.string(),
  color: v.string(),
  prize: v.number(),
})

const Orange = v.pipe(
  v.object({
    __typename: v.nullish(v.literal("Orange")),
    name: v.string(),
    color: v.string(),
    prize: v.number(),
  }),
  asObjectType({ interfaces: [Fruit] })
)
```
In the above code, we have created an interface `Fruit` using the `asObjectType` function and declared the `Orange` object as an implementation of the `Fruit` interface using the `interfaces` option.

#### Omitting Fields

We can also omit fields by setting `type` to `null` using the `asField` function, for example:

```ts twoslash
import * as v from "valibot"
import { asField } from "@gqloom/valibot"

const Dog = v.object({
  __typename: v.nullish(v.literal("Dog")),
  name: v.nullish(v.string()),
  birthday: v.pipe(v.nullish(v.date()), asField({ type: null })),
})
```

The following GraphQL Schema will be obtained:

```graphql title="GraphQL Schema"
type Dog {
  name: String
}
```

## Defining Union Types

When using `Valibot`, we can define union types using `variant` or `union`.

#### Using variant

We recommend using `variant` to define union types:

```ts twoslash
import * as v from "valibot"
import { asUnionType } from "@gqloom/valibot"

const Cat = v.object({
  __typename: v.literal("Cat"),
  name: v.string(),
  age: v.pipe(v.number(), v.integer()),
  loveFish: v.nullish(v.boolean()),
})

const Dog = v.object({
  __typename: v.literal("Dog"),
  name: v.string(),
  age: v.pipe(v.number(), v.integer()),
  loveBone: v.nullish(v.boolean()),
})

const Animal = v.pipe(
  v.variant("__typename", [Cat, Dog]),
  asUnionType({ name: "Animal" })
)
```

In the above code, we have created a union type using the `variant` function. In the case of `Animal`, it distinguishes the specific type by the `__typename` field.

#### Using union

We can also use `union` to define union types:

```ts twoslash
import { collectNames } from "@gqloom/core"
import { asUnionType } from "@gqloom/valibot"
import * as v from "valibot"

const Cat = v.object({
  name: v.string(),
  age: v.pipe(v.number(), v.integer()),
  loveFish: v.nullish(v.boolean()),
})

const Dog = v.object({
  name: v.string(),
  age: v.pipe(v.number(), v.integer()),
  loveBone: v.nullish(v.boolean()),
})

const Animal = v.pipe(
  v.union([Cat, Dog]),
  asUnionType({
    resolveType: (it) => (it.loveFish ? "Cat" : "Dog"),
  })
)

collectNames({ Cat, Dog, Animal })
```

In the above code, we have created a union type using the `union` function. In the case of `Animal`, it uses the `resolveType` function to differentiate between specific types.
Here, if an animal likes fish, then it is a cat, otherwise it is a dog.

## Defining Enumeration Types

We can define enumeration types using `v.picklist` or `v.enum_`.

#### Using picklist

In general, we prefer to use `v.picklist` to define enumerated types:

```ts twoslash
import * as v from "valibot"
import { asEnumType } from "@gqloom/valibot"

export const Fruit = v.pipe(
  v.picklist(["apple", "banana", "orange"]),
  asEnumType({
    name: "Fruit",
    valuesConfig: {
      apple: { description: "red" },
      banana: { description: "yellow" },
      orange: { description: "orange" },
    },
  })
)

export type IFruit = v.InferOutput<typeof Fruit>
```

#### Using enum_

We can also use `v.enum_` to define enumeration types:

```ts twoslash
import { asEnumType } from "@gqloom/valibot"
import * as v from "valibot"

export enum Fruit {
  apple = "apple",
  banana = "banana",
  orange = "orange",
}

export const FruitE = v.pipe(
  v.enum_(Fruit),
  asEnumType({
    name: "Fruit",
    valuesConfig: {
      apple: { description: "red" },
      [Fruit.banana]: { description: "yellow" },
      [Fruit.orange]: { description: "orange" },
    },
  })
)
```

## Custom Type Mappings

To accommodate more Valibot types, we can extend GQLoom to add more type mappings.

First we use `ValibotWeaver.config` to define the type mapping configuration. Here we import the `GraphQLDateTime`, `GraphQLJSON` and `GraphQLJSONObject` scalars from [graphql-scalars] and map them to the matching GraphQL scalars when encountering the `date`, `any` and `record` types.

```ts twoslash
import {
  GraphQLDateTime,
  GraphQLJSON,
  GraphQLJSONObject,
} from "graphql-scalars"
import { ValibotWeaver } from "@gqloom/valibot"

export const valibotWeaverConfig = ValibotWeaver.config({
  presetGraphQLType: (schema) => {
    switch (schema.type) {
      case "date":
        return GraphQLDateTime
      case "any":
        return GraphQLJSON
      case "record":
        return GraphQLJSONObject
    }
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
import { resolver } from "@gqloom/core"
import { ValibotWeaver } from "@gqloom/valibot"

export const valibotWeaverConfig = ValibotWeaver.config({
  presetGraphQLType: (schema) => {
    switch (schema.type) {
      case "date":
        return GraphQLDateTime
      case "any":
        return GraphQLJSON
      case "record":
        return GraphQLJSONObject
    }
  },
})
const helloResolver = resolver({})
// ---cut---
import { weave } from "@gqloom/core"

export const schema = weave(valibotWeaverConfig, helloResolver)
```

## Default Type Mappings

The following table lists the default mappings between Valibot types and GraphQL types in GQLoom:

| Valibot types                     | GraphQL types       |
| --------------------------------- | ------------------- |
| `v.array()`                       | `GraphQLList`       |
| `v.bigint()`                      | `GraphQLInt`        |
| `v.date()`                        | `GraphQLString`     |
| `v.enum_()`                       | `GraphQLEnumType`   |
| `v.picklist()`                    | `GraphQLEnumType`   |
| `v.literal(false)`                | `GraphQLBoolean`    |
| `v.literal(0)`                    | `GraphQLFloat`      |
| `v.literal("")`                   | `GraphQLString`     |
| `v.looseObject()`                 | `GraphQLObjectType` |
| `v.object()`                      | `GraphQLObjectType` |
| `v.objectWithRest()`              | `GraphQLObjectType` |
| `v.strict_object()`               | `GraphQLObjectType` |
| `v.nonNullable()`                 | `GraphQLNonNull`    |
| `v.nonNullish()`                  | `GraphQLNonNull`    |
| `v.nonOptional()`                 | `GraphQLNonNull`    |
| `v.number()`                      | `GraphQLFloat`      |
| `v.pipe(v.number(), v.integer())` | `GraphQLInt`        |
| `v.string()`                      | `GraphQLString`     |
| `v.pipe(v.string(), v.cuid2())`   | `GraphQLID`         |
| `v.pipe(v.string(), v.ulid())`    | `GraphQLID`         |
| `v.pipe(v.string(), v.uuid())`    | `GraphQLID`         |
| `v.union()`                       | `GraphQLUnionType`  |
| `v.variant()`                     | `GraphQLUnionType`  |
