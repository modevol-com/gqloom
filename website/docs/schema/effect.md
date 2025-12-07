# Effect

[Effect](https://effect.website/docs/essentials/Schema)'s `Schema` can describe both types and runtime validation at the same time. `@gqloom/effect` weaves Effect Schema into GraphQL Schema and reuses existing metadata (title/description/annotations).

## Installation

<!--@include: @/snippets/install-effect.md-->

## Defining simple scalars

In GQLoom, you can directly use Effect Schema as [silk](../silk):

```ts twoslash
import { Schema } from "effect"

const standard = Schema.standardSchemaV1

const StringScalar = standard(Schema.String) // GraphQLString

const BooleanScalar = standard(Schema.Boolean) // GraphQLBoolean

const FloatScalar = standard(Schema.Number) // GraphQLFloat

const IntScalar = standard(Schema.Int) // GraphQLInt

const IDScalar = standard(Schema.String.annotations({ identifier: "UUID" })) // GraphQLID
```

## Weave

Use `EffectWeaver` to let GQLoom understand Effect Schema:

```ts twoslash
import { weave, resolver, query } from "@gqloom/core"
import { EffectWeaver } from "@gqloom/effect"
import { Schema } from "effect"

const standard = Schema.standardSchemaV1

export const helloResolver = resolver({
  hello: query(standard(Schema.String), () => "Hello, World!"),
})

export const schema = weave(EffectWeaver, helloResolver)
```

## Defining objects

```ts twoslash
import { Schema } from "effect"

export const Cat = Schema.Struct({
  __typename: Schema.optional(Schema.Literal("Cat")),
  name: Schema.String,
  age: Schema.Int,
  loveFish: Schema.NullOr(Schema.Boolean),
})
```

## Names and more metadata

<!--@include: ./parts/naming.info.md-->

### Defining names for objects

#### Using `__typename` literal

```ts twoslash
import { Schema } from "effect"

export const Cat = Schema.Struct({
  __typename: Schema.Literal("Cat"), // Required and limited to "Cat"
  name: Schema.String,
  age: Schema.Int,
  loveFish: Schema.NullOr(Schema.Boolean),
})
```

#### Using `collectNames`

```ts twoslash
import { collectNames } from "@gqloom/core"
import { Schema } from "effect"

export const Cat = Schema.Struct({
  name: Schema.String,
  age: Schema.Int,
  loveFish: Schema.NullOr(Schema.Boolean),
})

collectNames({ Cat })
```

```ts twoslash
import { collectNames } from "@gqloom/core"
import { Schema } from "effect"

export const { Cat } = collectNames({
  Cat: Schema.Struct({
    name: Schema.String,
    age: Schema.Int,
    loveFish: Schema.NullOr(Schema.Boolean),
  }),
})
```

#### Using `asObjectType`

```ts twoslash
import { Schema } from "effect"
import { asObjectType } from "@gqloom/effect"

export const Cat = Schema.Struct({
  name: Schema.String,
  age: Schema.Int,
  loveFish: Schema.NullOr(Schema.Boolean),
}).annotations({
  [asObjectType]: { name: "Cat" },
})
```

### Adding more metadata

```ts twoslash
import { Schema } from "effect"
import { asField, asObjectType } from "@gqloom/effect"
import { GraphQLInt } from "graphql"

export const Cat = Schema.Struct({
  name: Schema.String,
  age: Schema.Int.annotations({
    [asField]: { type: GraphQLInt, description: "How old is the cat" },
  }),
  loveFish: Schema.NullOr(Schema.Boolean),
}).annotations({
  [asObjectType]: { name: "Cat", description: "A cute cat" },
})
```

The generated GraphQL Schema:

```graphql title="GraphQL Schema"
"""A cute cat"""
type Cat {
  name: String!

  """How old is the cat"""
  age: Int
  loveFish: Boolean
}
```

### Declaring interfaces

```ts twoslash
import { Schema } from "effect"
import { asObjectType } from "@gqloom/effect"

const Node = Schema.Struct({
  __typename: Schema.optional(Schema.Literal("Node")),
  id: Schema.String,
}).annotations({
  [asObjectType]: { name: "Node", description: "Node interface" },
})

const User = Schema.Struct({
  __typename: Schema.optional(Schema.Literal("User")),
  id: Schema.String,
  name: Schema.String,
}).annotations({
  [asObjectType]: { name: "User", interfaces: [Node] },
})
```

### Omitting fields

Setting `type` to `null` in `asField` or using `field.hidden` can hide fields from GraphQL:

```ts twoslash
import { Schema } from "effect"
import { asField } from "@gqloom/effect"

const Dog = Schema.Struct({
  __typename: Schema.optional(Schema.Literal("Dog")),
  name: Schema.optional(Schema.String),
  birthday: Schema.optional(Schema.Date).annotations({
    [asField]: { type: null },
  }),
})
```

## Defining union types

We recommend naming unions and adding descriptions:

```ts twoslash
import { Schema } from "effect"
import { asUnionType } from "@gqloom/effect"

const Cat = Schema.Struct({
  __typename: Schema.Literal("Cat"),
  meow: Schema.String,
})

const Dog = Schema.Struct({
  __typename: Schema.Literal("Dog"),
  bark: Schema.String,
})

const Animal = Schema.Union(Cat, Dog).annotations({
  [asUnionType]: { name: "Animal", description: "An animal union type" },
})
```

`EffectWeaver` will validate that union members must be object types and automatically handle the impact of `null/void`/optional members.

## Defining enum types

Use `Schema.Enums` and can attach GraphQL enum metadata:

```ts twoslash
import { Schema } from "effect"
import { asEnumType } from "@gqloom/effect"

export const Role = Schema.Enums({
  Admin: "ADMIN",
  User: "USER",
}).annotations({
  [asEnumType]: {
    name: "Role",
    valuesConfig: {
      Admin: { description: "Administrator" },
      User: { description: "Regular user" },
    },
  },
})
```

## Custom type mapping

Use `EffectWeaver.config` to provide preset GraphQL types for specific Schema:

```ts twoslash
import { Schema, SchemaAST } from "effect"
import { EffectWeaver } from "@gqloom/effect"
import { GraphQLDateTime, GraphQLJSON } from "graphql-scalars"
import { weave, resolver, query } from "@gqloom/core"

const standard = Schema.standardSchemaV1

export const effectWeaverConfig = EffectWeaver.config({
  presetGraphQLType: (schema) => {
    const identifier = SchemaAST.getAnnotation<string>(
      SchemaAST.IdentifierAnnotationId
    )(schema.ast).pipe((o) => (o._tag === "Some" ? o.value : null))

    if (identifier?.includes("Date")) return GraphQLDateTime
    if (identifier === "Any" || identifier === "JSON") return GraphQLJSON
  },
})

export const helloResolver = resolver({
  hello: query(standard(Schema.String), () => "Hello, World!"),
})

export const schema = weave(effectWeaverConfig, helloResolver)
```

## Default type mapping

The table below lists the default mapping relationship between GQLoom Effect Schema and GraphQL types (fields with `Schema.NullOr` / `Schema.optional` map to nullable types, others are wrapped with `GraphQLNonNull` by default):

| Effect Type/Feature                            | GraphQL Type                             |
| ---------------------------------------------- | ---------------------------------------- |
| `Schema.Array` / Tuple (first element)         | `GraphQLList`                            |
| `Schema.String`                                | `GraphQLString`                          |
| `identifier` containing `uuid`/`ulid`          | `GraphQLID`                              |
| `Schema.Literal("")`                           | `GraphQLString`                          |
| `Schema.Literal(false)`                        | `GraphQLBoolean`                         |
| `Schema.Literal(0)`                            | `GraphQLFloat`                           |
| `Schema.Number`                                | `GraphQLFloat`                           |
| `Schema.Int` / `Schema.Number` + `int()`       | `GraphQLInt`                             |
| `Schema.Boolean`                               | `GraphQLBoolean`                         |
| `Schema.Date` / `identifier` containing `Date` | `GraphQLString`                          |
| `Schema.Struct` / `Schema.Record`              | `GraphQLObjectType`                      |
| `Schema.Enums`                                 | `GraphQLEnumType`                        |
| `Schema.Union` (object union)                  | `GraphQLUnionType`                       |
| `Schema.suspend` / circular references         | resolved to corresponding types normally |
