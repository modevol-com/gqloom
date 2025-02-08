---
title: Zod
---

[Zod](https://zod.dev/) 是 TypeScript 优先的 Schema 声明和验证库。这里的 “Schema” 一词泛指任何数据类型，从简单的字符串到复杂的嵌套对象。

Zod 的设计尽可能方便开发人员使用。我们的目标是消除重复的类型声明。有了 Zod，你只需声明一次验证器，Zod 就会自动推断出 TypeScript 的静态类型。将较简单的类型组成复杂的数据结构也很容易。

`@gqloom/zod` 提供了 GQLoom 与 Zod 的集成，以便将 Zod Schema 编织成 GraphQL Schema。

## 安装

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

## 定义简单标量

在 GQLoom 中，可以直接使用 Zod Schema 作为[丝线](../fundamentals/silk)使用：

```ts twoslash
import { z } from "zod"

const StringScalar = z.string() // GraphQLString

const BooleanScalar = z.boolean() // GraphQLBoolean

const FloatScalar = z.number() // GraphQLFloat

const IntScalar = z.number().int() // GraphQLInt
```

## 编织 | Weave

为了让 `GQLoom` 能正确地将 Zod Schema 编织到 GraphQL Schema，我们在使用 `weave` 函数时，需要添加来自 `@gqloom/zod` 的 `ZodWeaver`。

```ts twoslash
import { ZodWeaver, weave, resolver, query } from "@gqloom/zod"
import { z } from "zod"

export const helloResolver = resolver({
  hello: query(z.string(), () => "Hello, World!"),
})

export const schema = weave(ZodWeaver, helloResolver)
```

## 定义对象

我们可以使用 Zod 定义对象，并将其作为[丝线](../fundamentals/silk)使用：
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

## 名称和更多元数据

### 为对象定义名称

在 `GQLoom` 中，我们有多种方法来为对象定义名称。

#### 使用 `__typename` 字面量
```ts
import { z } from "zod"

export const Cat = z.object({
  __typename: z.literal("Cat").nullish(),
  name: z.string(),
  age: z.number().int(),
  loveFish: z.boolean().nullish(),
})
```
在上面的代码中，我们使用 `__typename` 字面量来为对象定义名称。我们还将 `__typename` 字面量设置为 `nullish`，这意味着 `__typename` 字段是可选的，如果存在，则必须为 "Cat"。

```ts twoslash
import { z } from "zod"

export const Cat = z.object({
  __typename: z.literal("Cat"),
  name: z.string(),
  age: z.number().int(),
  loveFish: z.boolean().nullish(),
})
```
在上面的代码中，我们仍旧使用 `__typename` 字面量来为对象定义名称，但这次我们将 `__typename` 字面量设置为 "Cat"，这意味着 `__typename` 字段是必须的，且必须为 "Cat"，当使用 GraphQL `interface` 和 `union` 时，必填的 `__typename` 将非常有用。

#### 使用 `collectNames`

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

在上面的代码中，我们使用 `collectNames` 函数来为对象定义名称。`collectNames` 函数接受一个对象，该对象的键是对象的名称，值是对象本身。

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
在上面的代码中，我们使用 `collectNames` 函数来为对象定义名称，并将返回的对象解构为 `Cat` 并导出。

#### 使用 `asObjectType`
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

在上面的代码中，我们使用 `asObjectType` 函数创建一个元数据并将其传入 `superRefine()` 中来为对象定义名称。`asObjectType` 函数接受完整的 GraphQL 对象类型定义，并返回一个元数据。

### 添加更多元数据

通过 `asObjectType` 函数，我们可以为对象添加更多元数据，例如 `description`、`deprecationReason`、`extensions` 等。

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

在上面的代码中，我们为 `Cat` 对象添加了一个 `description` 元数据，该元数据将在 GraphQL Schema 中呈现：
```graphql
"""A cute cat"""
type Cat {
  name: String!
  age: Int!
  loveFish: Boolean
}
```

我们还可以使用 asField 函数为字段添加元数据，例如 description、type 等。
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

在上面的代码中，我们为 `age` 字段添加了 `type` 和 `description` 元数据，最终得到如下 GraphQL Schema：

```graphql
"""A cute cat"""
type Cat {
  name: String!

  """How old is the cat"""
  age: Int
  loveFish: Boolean
}
```

#### 声明接口

我们还可以使用 `asObjectType` 函数来声明接口，例如：
```ts twoslash
import { asObjectType } from "@gqloom/zod"
import { z } from "zod"

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
在上面的代码中，我们使用 `asObjectType` 函数创建了一个接口 `Fruit`，并使用 `interfaces` 选项将 `Orange` 对象声明为 `Fruit` 接口的实现。

#### 省略字段

我们还可以使用 `asField` 函数将 `type` 设置为 `null` 来省略字段，例如：
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
将得到如下 GraphQL Schema：
```graphql
type Dog {
  name: String
}
```

## 定义联合类型

#### 使用 z.discriminatedUnion

我们推荐使用 `z.discriminatedUnion` 来定义联合类型，例如：
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
在上面的代码中，我们使用 `z.discriminatedUnion` 函数创建了一个联合类型。对于 `Animal` 来说，它通过 `__typename` 字段来区分具体的类型。

#### 使用 z.union

我们还可以使用 `z.union` 来定义联合类型：

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
在上面的代码中，我们使用 `z.union` 函数创建了一个联合类型。对于 `Animal` 来说，我们通过 `resolveType` 函数来区分具体的类型。
在这里，如果一个动物它喜欢鱼，那么它就是一只猫，否则就是一只狗。

## 定义枚举类型

我们可以使用 `z.enum` 或 `z.nativeEnum` 定义枚举类型。

#### 使用 z.enum

通常，我们更推荐使用 `z.enum` 来定义枚举类型，例如：
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

#### 使用 z.nativeEnum

我们还可以使用 `z.nativeEnum` 来定义枚举类型，例如：
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

## 自定义类型映射

为了适应更多的 Zod 类型，我们可以拓展 GQLoom 为其添加更多的类型映射。

首先我们使用 `ZodWeaver.config` 来定义类型映射的配置。这里我们导入来自 [graphql-scalars](https://the-guild.dev/graphql/scalars) 的 `GraphQLDateTime`、`GraphQLJSON` 和 `GraphQLJSONObject` 标量，当遇到 `date`、`any` 和 `record` 类型时，我们将其映射到对应的 GraphQL 标量。

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

在编织 GraphQL Schema 时传入配置到 `weave` 函数中：

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

## 默认类型映射

下表列出了 GQLoom 中 Zod 类型与 GraphQL 类型之间的默认映射关系：

| Zod 类型                 | GraphQL 类型        |
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
