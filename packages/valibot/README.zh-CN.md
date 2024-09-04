# GQLoom

[English](./README.md) | 简体中文

GQLoom 是一个用于 TypeScript/JavaScript 的 GraphQL 编织器，使用 Zod、Yup 或者 Valibot 来愉快地编织 GraphQL Schema, 支持完善的类型推断以提供最好的开发体验。

# GQLoom Valibot

Valibot 是一个通用的数据验证库，考虑了捆绑包大小、类型安全和开发体验。

GQLoom Valibot 提供了 GQLoom 与 Valibot 的集成，以便将 Valibot Schema 编织成 GraphQL Schema。

## 声明简单标量

在 GQLoom 中，可以使用 `valibotSilk` 将 Valibot 的标量类型作为丝线使用。

```ts
import * as v from "valibot"
import { valibotSilk } from "@gqloom/valibot"

const StringScalar = valibotSilk(v.string()) // GraphQLString

const BooleanScalar = valibotSilk(v.boolean()) // GraphQLBoolean

const FloatScalar = valibotSilk(v.number()) // GraphQLFloat

const IntScalar = valibotSilk(v.pipe(v.nullable(v.number()), v.integer())) // GraphQLInt
```

## 解析器｜Resolver

为了将 Valibot Schema 作为丝线使用，我们需要为其包裹 `valibotSilk`，在开发中大量的包裹可能会显得有些繁琐，因此 `@gqloom/valibot` 提供重新导出了解析器和操作构造函数来简化这个过程。从 `@gqloom/valibot` 引入的 `resolver`、`query`、`mutation`、`field` 将在内部自动包裹 `valibotSilk`，这样在大部分情况下，我们可以直接使用 Valibot Schema。

```ts
import { resolver, query } from "@gqloom/valibot"

export const HelloResolver = resolver({
  hello: query(v.string(), () => "Hello, World!"),
})
```

## 声明对象

我们可以使用 Valibot 定义对象，并将其作为丝线使用。

```ts
import * as v from "valibot"
import { asObjectType, valibotSilk, collectNames } from "@gqloom/valibot"
import { printType } from "graphql"

export const Cat = v.object({
  name: v.string(),
  age: v.pipe(v.number(), v.integer()),
  loveFish: v.optional(v.boolean()),
})

collectNames({ Cat }) // 为 GraphQL 收集 Cat 名称
```

## 声明联合类型

使用 `variant` 或 `union` 定义联合类型。

#### 使用 variant

```ts
const Cat = v.object({
  __typename: v.literal("Cat"),
  name: v.string(),
  age: v.pipe(v.number(), v.integer()),
  loveFish: v.optional(v.boolean()),
})

const Dog = v.object({
  __typename: v.literal("Dog"),
  name: v.string(),
  age: v.pipe(v.number(), v.integer()),
  loveBone: v.optional(v.boolean()),
})

const Animal = v.pipe(v.variant("__typename", [Cat, Dog]))

collectNames({ Cat, Dog, Animal }) // 为 GraphQL 收集名称
```

#### 使用 union

```ts
import * as v from "valibot"
import { asUnionType, valibotSilk, collectNames } from "@gqloom/valibot"
import { printType } from "graphql"

const Cat = v.object({
  name: v.string(),
  age: v.pipe(v.number(), v.integer()),
  loveFish: v.optional(v.boolean()),
})

const Dog = v.object({
  name: v.string(),
  age: v.pipe(v.number(), v.integer()),
  loveBone: v.optional(v.boolean()),
})

const Animal = v.pipe(
  v.union([Cat, Dog]),
  asUnionType({
    // 定义 resolveType 函数运行时在获取对象的类型名称
    resolveType: (it) => (it.loveFish ? "Cat" : "Dog"),
  })
)

collectNames({ Cat, Dog, Animal }) // 为 GraphQL 收集名称
```

## 声明枚举类型

使用 `picklist` 或 `enum_` 定义枚举类型。

```ts
import * as v from "valibot"
import { asEnumType, valibotSilk } from "@gqloom/valibot"

const Fruit = v.pipe(
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
```

```ts
enum Fruit {
  apple = "apple",
  banana = "banana",
  orange = "orange",
}

const FruitE = v.pipe(
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

## 自定义类型映射

为了适应更多的 Valibot 类型，我们可以拓展 GQLoom 为其添加更多的类型映射。

首先我们使用 `ValibotWeaver.config` 来类型映射的配置。这里我们导入来自 `graphql-scalars` 的 `GraphQLDateTime`、`GraphQLJSON` 和 `GraphQLJSONObject` 标量，当遇到 `date`、`any` 和 `record` 类型时，我们将其映射到对应的 GraphQL 标量。

```ts
import {
  GraphQLDateTime,
  GraphQLJSON,
  GraphQLJSONObject,
} from "graphql-scalars"
import { ValibotWeaver } from "@gqloom/valibot"

export const valibotWeaverConfig = ValibotWeaver.config({
  presetGraphQLType: (schema) => {
    const pipe = ValibotMetadataCollector.getPipe(schema)
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

在编织 GraphQL Schema 时传入配置到 `weave` 中。

```ts
import { weave } from "@gqloom/valibot"

export const schema = weave(valibotWeaverConfig, HelloResolver)
```
