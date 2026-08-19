<script setup lang="ts">
import { Tabs } from '@/components/tabs'
</script>

# JSON Schema

[JSON Schema](https://json-schema.org/) is a declarative language for annotating and validating JSON documents' structure, constraints, and data types. It helps you standardize and define expectations for JSON data.

## Installation

We can use JSON Schema directly in our project, or use [typebox](https://sinclairzx81.github.io/typebox/) to help us build JSON Schema.


<Tabs groupId="json-schema-builder">
<template #JSON_Schema>

<!--@include: @/snippets/install-json-schema.md-->

</template>
<template #TypeBox>

<!--@include: @/snippets/install-typebox.md-->

</template>
</Tabs>

## Defining Simple Scalars

<Tabs groupId="json-schema-builder">
<template #JSON_Schema>

In GQLoom, you can use the `jsonSilk` function to use a JSON Schema as a [silk](../silk.md):

```ts twoslash
import { jsonSilk } from "@gqloom/json"

const StringScalar = jsonSilk({ type: "string" })

const BooleanScalar = jsonSilk({ type: "boolean" })

const FloatScalar = jsonSilk({ type: "number" })

const IntScalar = jsonSilk({ type: "integer" })
```

</template>
<template #TypeBox>

Since `TypeBox` does not adhere to the [Standard Schema](https://github.com/standard-schema/standard-schema), we need to wrap the `TypeBox` schema with an additional function to make it usable in GQLoom:

```ts twoslash
import { type TSchema, type Static } from "typebox"
import { type GraphQLSilk } from "@gqloom/core"
import { JSONWeaver } from "@gqloom/json"

export function typeSilk<T extends TSchema>(
  type: T
): T & GraphQLSilk<Static<T>, Static<T>> {
  return JSONWeaver.unravel(type) as T & GraphQLSilk<Static<T>, Static<T>>
}
```

Then, we can use the `typeSilk` function to convert a `typebox` schema into a [silk](../silk.md):

```ts twoslash
import { type TSchema, type Static } from "typebox"
import { type GraphQLSilk } from "@gqloom/core"
import { JSONWeaver } from "@gqloom/json"

export function typeSilk<T extends TSchema>(
  type: T
): T & GraphQLSilk<Static<T>, Static<T>> {
  return JSONWeaver.unravel(type) as T & GraphQLSilk<Static<T>, Static<T>>
}
// ---cut---
import { Type } from "typebox"

const StringScalar = typeSilk(Type.String())

const BooleanScalar = typeSilk(Type.Boolean())

const FloatScalar = typeSilk(Type.Number())

const IntScalar = typeSilk(Type.Integer())
```

</template>
</Tabs>

## Defining Objects

<Tabs groupId="json-schema-builder">
<template #JSON_Schema>

When defining an object, you also need to wrap it with the `jsonSilk` function:

```ts twoslash
import { jsonSilk } from "@gqloom/json"

const Cat = jsonSilk({
  title: "Cat",
  type: "object",
  properties: {
    name: { type: "string" },
    age: { type: "integer" },
    loveFish: { type: ["boolean", "null"] },
  },
  required: ["name", "age"],
})
```

</template>
<template #TypeBox>

When defining an object, you also need to wrap it with the `typeSilk` function:

```ts twoslash
import { type TSchema, type Static } from "typebox"
import { type GraphQLSilk } from "@gqloom/core"
import { JSONWeaver } from "@gqloom/json"

export function typeSilk<T extends TSchema>(
  type: T
): T & GraphQLSilk<Static<T>, Static<T>> {
  return JSONWeaver.unravel(type) as T & GraphQLSilk<Static<T>, Static<T>>
}
// ---cut---
import { Type } from "typebox"

const Cat = typeSilk(
  Type.Object(
    {
      name: Type.String(),
      age: Type.Integer(),
      loveFish: Type.Optional(Type.Boolean()),
    },
    { title: "Cat" }
  )
)
```

</template>
</Tabs>

### Naming Objects

<!--@include: ./parts/naming.info.md-->

We can use the `title` property of JSON Schema to name an object, as in the example code above; we can also use a `__typename` literal to name it:

<Tabs groupId="json-schema-builder">
<template #JSON_Schema>

```ts twoslash
import { jsonSilk } from "@gqloom/json"

const Cat = jsonSilk({
  type: "object",
  properties: {
    __typename: { const: "Cat" },
    name: { type: "string" },
    age: { type: "integer" },
    loveFish: { type: ["boolean", "null"] },
  },
  required: ["name", "age"],
})
```

</template>
<template #TypeBox>

```ts twoslash
import { type TSchema, type Static } from "typebox"
import { type GraphQLSilk } from "@gqloom/core"
import { JSONWeaver } from "@gqloom/json"

export function typeSilk<T extends TSchema>(
  type: T
): T & GraphQLSilk<Static<T>, Static<T>> {
  return JSONWeaver.unravel(type) as T & GraphQLSilk<Static<T>, Static<T>>
}
// ---cut---
import { Type } from "typebox"
const Cat = typeSilk(
  Type.Object({
    __typename: Type.Optional(Type.Literal("Cat")),
    name: Type.String(),
    age: Type.Integer(),
    loveFish: Type.Optional(
      Type.Boolean({ description: "Does the cat love fish?" })
    ),
  })
)
```

</template>
</Tabs>

## Defining Union Types

<Tabs groupId="json-schema-builder">
<template #JSON_Schema>

We can use the `oneOf` property of JSON Schema to define a union type:

```ts twoslash
import { jsonSilk } from "@gqloom/json"

const Cat = jsonSilk({
  title: "Cat",
  type: "object",
  properties: {
    __typename: { const: "Cat" },
    name: { type: "string" },
    loveFish: { type: "boolean" },
  },
})

const Dog = jsonSilk({
  title: "Dog",
  type: "object",
  properties: {
    __typename: { const: "Dog" },
    name: { type: "string" },
    loveBone: { type: "boolean" },
  },
})

const Animal = jsonSilk({
  title: "Animal",
  oneOf: [Cat, Dog],
})
```

</template>
<template #TypeBox>

We can use the `Type.Union` function to define a union type:

```ts twoslash
import { type TSchema, type Static } from "typebox"
import { type GraphQLSilk } from "@gqloom/core"
import { JSONWeaver } from "@gqloom/json"

export function typeSilk<T extends TSchema>(
  type: T
): T & GraphQLSilk<Static<T>, Static<T>> {
  return JSONWeaver.unravel(type) as T & GraphQLSilk<Static<T>, Static<T>>
}
// ---cut---
import { Type } from "typebox"

const Cat = typeSilk(
  Type.Object(
    {
      __typename: Type.Literal("Cat"),
      name: Type.String(),
      loveFish: Type.Boolean(),
    },
    { title: "Cat" }
  )
)

const Dog = typeSilk(
  Type.Object(
    {
      __typename: Type.Literal("Dog"),
      name: Type.String(),
      loveBone: Type.Boolean(),
    },
    { title: "Dog" }
  )
)

const Animal = typeSilk(Type.Union([Cat, Dog], { title: "Animal" }))
```

</template>
</Tabs>

## Defining Enum Types

<Tabs groupId="json-schema-builder">
<template #JSON_Schema>

We can use the `enum` property of JSON Schema to define an enum type:

```ts twoslash
import { jsonSilk } from "@gqloom/json"

const Fruit = jsonSilk({
  title: "Fruit",
  description: "Some fruits you might like",
  enum: ["apple", "banana", "orange"],
})
```
</template>
<template #TypeBox>

We can use the `Type.Enum` function to define an enum type:

```ts twoslash
import { type TSchema, type Static } from "typebox"
import { type GraphQLSilk } from "@gqloom/core"
import { JSONWeaver } from "@gqloom/json"

export function typeSilk<T extends TSchema>(
  type: T
): T & GraphQLSilk<Static<T>, Static<T>> {
  return JSONWeaver.unravel(type) as T & GraphQLSilk<Static<T>, Static<T>>
}
// ---cut---
import { Type } from "typebox"

const Fruit = typeSilk(
  Type.Enum(["apple", "banana", "orange"], {
    title: "Fruit",
    description: "Some fruits you might like",
  })
)
```
</template>
</Tabs>

## Custom Type Mapping

To accommodate more JSON Schema types, we can extend GQLoom by adding more type mappings.

First, we use `JSONWeaver.config` to define the configuration for type mapping.
Here we import the `GraphQLDate` scalar from [graphql-scalars](https://the-guild.dev/graphql/scalars). When a `date` type is encountered, we map it to the corresponding GraphQL scalar.

```ts twoslash
import { JSONWeaver } from "@gqloom/json"
import { GraphQLDate } from "graphql-scalars"

const jsonWeaverConfig = JSONWeaver.config({
  presetGraphQLType: (schema) => {
    if (typeof schema === "object" && schema.format === "date")
      return GraphQLDate
  },
})
```

When weaving the GraphQL Schema, pass the configuration to the `weave` function:

```ts
import { weave } from "@gqloom/json"

export const schema = weave(jsonWeaverConfig, helloResolver)
```

## Default Type Mappings

The following table lists the default mappings between JSON Schema types and GraphQL types in GQLoom:

| JSON Schema Property  | GraphQL Type        |
| --------------------- | ------------------- |
| `{"type": "string"}`  | `GraphQLString`     |
| `{"type": "number"}`  | `GraphQLFloat`      |
| `{"type": "integer"}` | `GraphQLInt`        |
| `{"type": "boolean"}` | `GraphQLBoolean`    |
| `{"type": "object"}`  | `GraphQLObjectType` |
| `{"type": "array"}`   | `GraphQLList`       |
| `{"enum": [...]}`     | `GraphQLEnumType`   |
| `{"oneOf": [...]}`    | `GraphQLUnionType`  |
| `{"anyOf": [...]}`    | `GraphQLUnionType`  |
