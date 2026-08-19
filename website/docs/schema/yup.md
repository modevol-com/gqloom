# Yup

[Yup](https://github.com/jquense/yup) is a schema builder for runtime value parsing and validation. 
Define a schema, transform a value to match, assert the shape of an existing value, or both. 
Yup schema are extremely expressive and allow modeling complex, interdependent validations, or value transformation.

`@gqloom/yup` provides integration of GQLoom with Yup to weave Yup Schema into GraphQL Schema.

## Installation

<!--@include: ../../snippets/install-yup.md-->

Also, we need to declare metadata from GQLoom for Yup in the project:

```ts [yup.d.ts]
import 'yup'
import { type GQLoomMetadata } from "@gqloom/yup"

declare module "yup" {
  export interface CustomSchemaMetadata extends GQLoomMetadata {}
}
```

## Defining simple scalars

Yup Schema can be used directly as a [silk](../silk) in GQLoom:

```ts twoslash
import { number, string, boolean } from "yup"

const StringScalar = string() // GraphQLString

const BooleanScalar = boolean() // GraphQLBoolean

const FloatScalar = number() // GraphQLFloat

const IntScalar = number().integer() // GraphQLInt
```

## Weaving

For `GQLoom` to properly weave Yup Schema into GraphQL Schema, we need to add `YupWeaver` from `@gqloom/yup` when using the `weave` function.

```ts twoslash
import { weave, resolver, query } from "@gqloom/core"
import { YupWeaver } from "@gqloom/yup"
import { string } from "yup"

export const helloResolver = resolver({
  hello: query(string(), () => "Hello, World!"),
})

export const schema = weave(YupWeaver, helloResolver)
```

## Defining objects

We can use Yup to define objects and use them as [silk](../silk) to use:
```ts twoslash
import { string, boolean, object, number } from "yup"

export const Cat = object({
  name: string().required(),
  age: number().integer().required(),
  loveFish: boolean(),
}).label("Cat")
```

## Names and more metadata

### Defining names for objects

<!--@include: ./parts/naming.info.md-->

#### Using `label()`

The recommended practice is to use the built-in `label` method in `yup` to define a name for the object, for example:

```ts twoslash
import { string, boolean, object, number } from "yup"

export const Cat = object({
  name: string().required(),
  age: number().integer().required(),
  loveFish: boolean(),
}).label("Cat")
```

::: details Using `collectNames`

We can use the `collectNames` function to define names for objects. The `collectNames` function accepts an object whose key is the name of the object and whose value is the object itself.

```ts twoslash
import { string, boolean, object, number } from "yup"
import { collectNames } from "@gqloom/yup"

export const Cat = object({
  name: string().required(),
  age: number().integer().required(),
  loveFish: boolean(),
})

collectNames({ Cat })
```

We can also use the `collectNames` function to define names for objects and deconstruct the returned objects into `Cat` and export them.

```ts twoslash
import { string, boolean, object, number } from "yup"
import { collectNames } from "@gqloom/yup"

export const { Cat } = collectNames({
  Cat: object({
    name: string().required(),
    age: number().integer().required(),
    loveFish: boolean(),
  }),
})
```
:::

::: details Using `asObjectType` metadata

We can use the `meta` function in Yup Schema to define a name for the object.   
Here, we define the `asObjectType` metadata and set it to `{ name: "Cat" }` so that in the generated GraphQL Schema, the object will have the name `Cat`.

```ts twoslash
import { string, boolean, object, number } from "yup"

export const Cat = object({
  name: string().required(),
  age: number().integer().required(),
  loveFish: boolean(),
}).meta({ asObjectType: { name: "Cat" } })
```
:::

### Adding more metadata

We can use the `meta` function in Yup Schema to add more metadata, such as `description`, `deprecationReason`, `extensions` and so on.
```ts twoslash
import { string, boolean, object, number } from "yup"

export const Cat = object({
  name: string().required(),
  age: number().integer().required(),
  loveFish: boolean(),
}).meta({ asObjectType: { name: "Cat", description: "A cute cat" } })
```

In the above code, we have added `description` metadata to the `Cat` object so that in the generated GraphQL Schema, the object will have the description `A cute cat`:

```graphql [GraphQL Schema]
"""A cute cat"""
type Cat {
  name: String!
  age: Int!
  loveFish: Boolean
}
```

We can also use the `asField` attribute in the metadata to add metadata to the field, such as `description`, `type`, and so on:

```ts twoslash
import 'yup'
import { type GQLoomMetadata } from "@gqloom/yup"

declare module "yup" {
  export interface CustomSchemaMetadata extends GQLoomMetadata {}
}
// ---cut---
import { string, boolean, object, number } from "yup"
import { GraphQLInt } from "graphql"

export const Cat = object({
  name: string().required(),
  age: number().meta({
    asField: { // [!code highlight]
      type: () => GraphQLInt, // [!code highlight]
      description: "How old is the cat", // [!code highlight]
      extensions: { // [!code highlight]
        complexity: 2, // [!code highlight]
      }, // [!code highlight]
    }, // [!code highlight]
  }),
  loveFish: boolean(),
}).meta({ asObjectType: { name: "Cat", description: "A cute cat" } })
```

In the above code, we added `type` and `description` metadata to the `age` field and ended up with the following GraphQL Schema:

```graphql [GraphQL Schema]
"""A cute cat"""
type Cat {
  name: String!

  """How old is the cat"""
  age: Int
  loveFish: Boolean
}
```

#### Declaring Interfaces

We can also use the asObjectType function to declare interfaces, for example:
```ts twoslash
import 'yup'
import { type GQLoomMetadata } from "@gqloom/yup"

declare module "yup" {
  export interface CustomSchemaMetadata extends GQLoomMetadata {}
}
// ---cut---
import { string, object, number } from "yup"

const Fruit = object({
  name: string().required(),
  color: string().required(),
  prize: number()
    .required()
    .meta({ description: "How much do you want to win?" }),
})
  .meta({ description: "Fruit Interface" })
  .label("Fruit")

const Orange = object({
  name: string().required(),
  color: string().required(),
  prize: number().required(),
})
  .meta({ asObjectType: { interfaces: [Fruit] } })
  .label("Orange")
```
In the code above, we declared the `Orange` object as an implementation of the `Fruit` interface using the `interfaces` attribute in `asObjectType`.

#### Omitting fields

We can also omit fields by setting the type to null using the asField attribute, for example:
```ts twoslash
import 'yup'
import { type GQLoomMetadata } from "@gqloom/yup"

declare module "yup" {
  export interface CustomSchemaMetadata extends GQLoomMetadata {}
}
// ---cut---
import { string, boolean, object, number } from "yup"

export const Cat = object({
  name: string().required(),
  age: number()
    .integer()
    .meta({ asField: { type: null } }),
}).meta({ asObjectType: { name: "Cat", description: "A cute cat" } })
```
The following GraphQL Schema will be generated:
```graphql [GraphQL Schema]
type Dog {
  name: String
}
```
## Defining Union Types

Use `union` from `@gqloom/yup` to define union types, for example:
```ts
import { object, string, number } from "yup"
import { union } from "@gqloom/yup"

const Cat = object({
  name: string(). required(),
  color: string().required(),
}).label("Cat")

const Dog = object({
  name: string().required(),
  height: number().required(),
}).label("Dog")

const Animal = union([Cat, Dog]).label("Animal")
```
In the above code, we used the `union` function to define the `Cat` and `Dog` objects as members of the `Animal` union type.

## Defining enumerated types

#### Using `oneof()`

We can use `string().oneof()` to define enumerated types, for example:

```ts twoslash
import 'yup'
import { type GQLoomMetadata } from "@gqloom/yup"

declare module "yup" {
  export interface CustomSchemaMetadata extends GQLoomMetadata {}
}
// ---cut---
import { string } from "yup"

const Fruit = string()
  .oneOf(["apple", "banana", "orange"])
  .label("Fruit")
  .meta({
    asEnumType: {
      description: "Some fruits you might like",
      valuesConfig: {
        apple: { description: "Apple is red" },
        banana: { description: "Banana is yellow" },
        orange: { description: "Orange is orange" },
      },
    },
  })
```

#### Using `enum`

We can also use `enum` to define enumeration types, for example:
```ts twoslash
import 'yup'
import { type GQLoomMetadata } from "@gqloom/yup"

declare module "yup" {
  export interface CustomSchemaMetadata extends GQLoomMetadata {}
}
// ---cut---
import { mixed } from "yup"

enum FruitEnum {
  apple,
  banana,
  orange,
}

const Fruit = mixed()
  .oneOf(Object.values(FruitEnum) as FruitEnum[])
  .label("Fruit")
  .meta({
    asEnumType: {
      enum: FruitEnum,
      description: "Some fruits you might like",
      valuesConfig: {
        apple: { description: "Apple is red" },
        banana: { description: "Banana is yellow" },
        orange: { description: "Orange is orange" },
      },
    },
  })
```

## Custom Type Mappings

To accommodate more Yup types, we can extend GQLoom to add more type mappings to it.

First we use `YupWeaver.config` to define the type mapping configuration.   
Here we import `GraphQLDateTime` from [graphql-scalars](https://the-guild.dev/graphql/scalars), and when we encounter a `date` type, we map it to the matching GraphQL scalar.
```ts twoslash
import { GraphQLDateTime } from "graphql-scalars"
import { YupWeaver } from "@gqloom/yup"

export const yupWeaverConfig = YupWeaver.config({
  presetGraphQLType: (description) => {
    switch (description.type) {
      case "date":
        return GraphQLDateTime
    }
  },
})
```
Configurations are passed into the weave function when weaving the GraphQL Schema:

```ts twoslash
import { GraphQLDateTime } from "graphql-scalars"
import { resolver } from "@gqloom/core"
import { YupWeaver } from "@gqloom/yup"

export const yupWeaverConfig = YupWeaver.config({
  presetGraphQLType: (description) => {
    switch (description.type) {
      case "date":
        return GraphQLDateTime
    }
  },
})

export const helloResolver = resolver({})
// ---cut---
import { weave } from "@gqloom/yup"

export const schema = weave(yupWeaverConfig, helloResolver)
```

## Default Type Mappings

The following table lists the default mappings between Yup types and GraphQL types in GQLoom:

| Yup types                    | GraphQL types       |
| ---------------------------- | ------------------- |
| `string()`                   | `GraphQLString`     |
| `number()`                   | `GraphQLFloat`      |
| `number().integer()`         | `GraphQLInt`        |
| `boolean()`                  | `GraphQLBoolean`    |
| `object()`                   | `GraphQLObjectType` |
| `array()`                    | `GraphQLList`       |
| `union()`                    | `GraphQLUnionType`  |
| `string().oneof(["Value1"])` | `GraphQLEnumType`   |
