# Valibot

[Valibot](https://valibot.dev/) 是一个通用的数据验证库，考虑了捆绑包大小、类型安全和开发体验。

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
import { collectNames } from "@gqloom/valibot"

export const Cat = v.object({
  name: v.string(),
  age: v.pipe(v.number(), v.integer()),
  loveFish: v.nullish(v.boolean()),
})

collectNames({ Cat }) // 为 Cat 收集名称，在编织后将呈现在 GraphQL Schema 中
```

## 名称和更多元数据

在 `GQLoom` 中，我们有多种方法来为对象定义名称。

### 为对象定义名称

#### 使用 `__typename` 字面量

```ts
import * as v from "valibot"

export const Cat = v.object({
  __typename: v.nullish(v.literal("Cat")),
  name: v.string(),
  age: v.pipe(v.number(), v.integer()),
  loveFish: v.nullish(v.boolean()),
})
```

在上面的代码中，我们使用 `__typename` 字面量来为对象定义名称。我们还将 `__typename` 字面量设置为 `nullish`，这意味着 `__typename` 字段是可选的，如果存在，则必须为 "Cat"。

```ts
import * as v from "valibot"

export const Cat = v.object({
  __typename: v.literal("Cat"),
  name: v.string(),
  age: v.pipe(v.number(), v.integer()),
  loveFish: v.nullish(v.boolean()),
})
```

在上面的代码中，我们仍旧使用 `__typename` 字面量来为对象定义名称，但这次我们将 `__typename` 字面量设置为 "Cat"，这意味着 `__typename` 字段是必须的，且必须为 "Cat"，当使用 GraphQL `interface` 和 `union` 时，必填单 `__typename` 将非常有用。

#### 使用 `collectNames`

```ts
import * as v from "valibot"
import { collectNames } from "@gqloom/valibot"

export const Cat = v.object({
  name: v.string(),
  age: v.pipe(v.number(), v.integer()),
  loveFish: v.nullish(v.boolean()),
})

collectNames({ Cat }) // 为 Cat 收集名称，在编织后将呈现在 GraphQL Schema 中
```

在上面的代码中，我们使用 `collectNames` 函数来为对象定义名称。`collectNames` 函数接受一个对象，该对象的键是对象的名称，值是对象本身。

```ts
import * as v from "valibot"
import { collectNames } from "@gqloom/valibot"

export const { Cat } = collectNames({
  Cat: v.object({
    name: v.string(),
    age: v.pipe(v.number(), v.integer()),
    loveFish: v.nullish(v.boolean()),
  }),
})
```

在上面的代码中，我们使用 `collectNames` 函数来为对象定义名称，并将返回的对象解构为 `Cat` 并导出。

#### 使用 `asObjectType`

```ts
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

在上面的代码中，我们使用 `asObjectType` 函数创建一个元数据并将其传入 `Valibot` 管道中来为对象定义名称。`asObjectType` 函数接受完整的 GraphQL 对象类型定义，并返回一个元数据对。

### 添加更多元信息

通过 `asObjectType` 函数，我们可以为对象添加更多元信息，例如 `description`、`deprecationReason`、`extensions` 等。

```ts
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

在上面的代码中，我们为 `Cat` 对象添加了一个 `description` 元信息，该元信息将在 GraphQL Schema 中呈现：

```gql
"""
A cute cat
"""
type Cat {
  name: String!
  age: Int!
  loveFish: Boolean
}
```

我们还可以使用 `asField` 函数为字段添加元信息，例如 `description`、`type` 等。

```ts
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

在上面的代码中，我们为 `age` 字段添加了 `type` 和 `description` 元信息，该元信息将在 GraphQL Schema 中呈现：

```gql
"""
A cute cat
"""
type Cat {
  name: String!

  """
  How old is the cat
  """
  age: Int
  loveFish: Boolean
}
```

## 声明联合类型

使用 `variant` 或 `union` 定义联合类型。

#### 使用 variant

```ts
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
    // 定义 resolveType 函数运行时在获取对象的类型名称
    resolveType: (it) => (it.loveFish ? "Cat" : "Dog"),
  })
)

collectNames({ Cat, Dog, Animal }) // 为 GraphQL 收集名称
```

## 声明枚举类型

使用 `v.picklist` 或 `v.enum_` 定义枚举类型。

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
