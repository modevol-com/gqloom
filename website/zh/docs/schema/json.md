<script setup lang="ts">
import { Tabs } from '@/components/tabs'
</script>

# JSON Schema

[JSON Schema](https://json-schema.org/) 是一种声明性语言，用于标注和验证 JSON 文档的结构、约束条件及数据类型。它可帮助你实现 JSON 数据的标准化，并明确对 JSON 数据的预期要求。

## 安装

我们可以在项目中直接使用 JSON Schema，也可以使用 [typebox](https://sinclairzx81.github.io/typebox/) 帮助我们构建 JSON Schema。


<Tabs groupId="json-schema-builder">
<template #JSON_Schema>

<!--@include: ../../snippets/install-json-schema.md-->

</template>
<template #TypeBox>

<!--@include: ../../snippets/install-typebox.md-->

</template>
</Tabs>

## 定义简单标量

<Tabs groupId="json-schema-builder">
<template #JSON_Schema>

在 GQLoom 中，可以使用 `jsonSilk`函数 将 JSON Schema 作为[丝线](../silk.md)使用：

```ts twoslash
import { jsonSilk } from "@gqloom/json"

const StringScalar = jsonSilk({ type: "string" })

const BooleanScalar = jsonSilk({ type: "boolean" })

const FloatScalar = jsonSilk({ type: "number" })

const IntScalar = jsonSilk({ type: "integer" })
```

</template>
<template #TypeBox>

由于 `TypeBox` 不遵守 [Standard Schema](https://github.com/standard-schema/standard-schema)，我们需要使用额外的函数包裹 `TypeBox` 的 Schema 使其能在 GQLoom 中使用：

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

随后，我们可以使用 `typeSilk` 函数将 `typebox` 的 Schema 转换为[丝线](../silk.md)：

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

## 定义对象

<Tabs groupId="json-schema-builder">
<template #JSON_Schema>

在定义对象时，也需要使用 `jsonSilk` 函数包裹：

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

在定义对象时，也需要使用 `typeSilk` 函数包裹：

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

### 为对象命名

<!--@include: ./parts/naming.info.md-->

我们可以使用 JSON Schema 的 `title` 属性为对象命名，比如上面的示例代码；也可以使用 `__typename` 字面量来为对象命名：

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

## 定义联合类型

<Tabs groupId="json-schema-builder">
<template #JSON_Schema>

我们可以使用 JSON Schema 的 `oneOf` 属性来定义联合类型：

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

我们可以使用 `Type.Union` 函数来定义联合类型：

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

## 定义枚举类型

<Tabs groupId="json-schema-builder">
<template #JSON_Schema>

我们可以使用 JSON Schema 的 `enum` 属性来定义枚举类型：

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

我们可以使用 `Type.Enum` 函数来定义枚举类型：

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

## 自定义类型映射

为了适应更多的 JSON Schema 类型，我们可以拓展 GQLoom 为其添加更多的类型映射。

首先我们使用 `JSONWeaver.config` 来定义类型映射的配置。  
这里我们导入来自 [graphql-scalars](https://the-guild.dev/graphql/scalars) 的 `GraphQLDate` 标量，当遇到 `date` 类型时，我们将其映射到对应的 GraphQL 标量。

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

在编织 GraphQL Schema 时传入配置到 `weave` 函数中：

```ts
import { weave } from "@gqloom/json"

export const schema = weave(jsonWeaverConfig, helloResolver)
```

## 默认类型映射

下表列出了 GQLoom 中 JSON Schema 类型与 GraphQL 类型之间的默认映射关系：

| JSON Schema 属性      | GraphQL 类型        |
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
