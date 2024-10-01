# 丝线 | Silk

`GQLoom` 的全称是 GraphQL Loom，即 GraphQL 纺织机。

丝线是纺织机的基本原料，它同时反应 GraphQL 类型和 TypeScript 类型。
在开发时，我们使用现有的模式库的 Schema 作为丝线，最终 `GQLoom` 会将丝线编织进 GraphQL Schema。

## 简单的标量丝线

我们可以使用 `silk` 函数创建一个简单的标量丝线：

```ts
import { silk } from "@gqloom/core"
import { GraphQLString, GraphQLInt } from "graphql"

const StringSilk = silk(GraphQLString)
const IntSilk = silk(GraphQLInt)

const NonNullStringSilk = silk(new GraphQLNonNull(GraphQLString))
const NonNullStringSilk_1 = silk.nonNull(StringSilk)
```

## 对象丝线

我们可以直接使用 [graphql.js](https://graphql.org/graphql-js/constructing-types/) 构造 GraphQL 对象：

```ts
import { silk } from "@gqloom/core"
import {
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLInt,
} from "graphql"

interface ICat {
  name: string
  age: number
}

const Cat = silk<ICat>(
  new GraphQLObjectType({
    name: "Cat",
    fields: {
      name: { type: new GraphQLNonNull(GraphQLString) },
      age: { type: new GraphQLNonNull(GraphQLInt) },
    },
  })
)
```

在上面的代码中：我们定义了一个 `ICat` 接口，并使用 `silk` 函数定义了一个名为 `Cat` 的丝线。
其中，`silk` 函数接受 `ICat` 作为泛型参数，还接受一个 `GraphQLObjectType` 实例用来阐述 `Cat` 在 GraphQL 中的详细结构。

`Cat` 在 GraphQL 中将呈现为：

```graphql
type Cat {
  name: String!
  age: Int!
}
```

你可能注意到了，使用 `graphql.js` 来创建丝线需要同时声明 `ICat` 接口和 `GraphQLObjectType`，也就是说，我们为 `Cat` 创建了两份定义。
重复的定义让代码损失了简洁性，也增加了维护成本。

## 使用模式库创建丝线

好在，我们有像 [Valibot](https://valibot.dev/)、[Zod](https://zod.dev/) 这样的模式库，它们创建的 Schema 将携带 TypeScript 类型，并在运行时仍然保持类型。
`GQLoom` 可以直接使用这些 Schema 作为丝线，而不需要重复定义。

### 使用 Valibot 创建丝线：

```ts
import * as v from "valibot"
import { valibotSilk } from "@gqloom/valibot"

const StringSilk = valibotSilk(v.string())

const BooleanSilk = valibotSilk(v.boolean())

const Cat = valibotSilk(
  v.object({
    __typename: v.literal("Cat"),
    name: v.string(),
    age: v.number(),
  })
)
```

在上面的代码中，我们使用 [Valibot](https://valibot.dev/) 创建了一些简单的 Schema 作为丝线，你可以在[Valibot 集成](../schema-integration/valibot)章节中了解如何使用 [Valibot](https://valibot.dev/) 创建更复杂的类型。

### 使用 Zod 创建丝线：

```ts
import { z } from "zod"
import { zodSilk } from "@gqloom/zod"

const StringSilk = zodSilk(z.string())

const BooleanSilk = zodSilk(z.boolean())

const Cat = zodSilk(
  z.object({
    __typename: z.literal("Cat"),
    name: z.string(),
    age: z.number(),
  })
)
```

在上面的代码中，我们使用 [Zod](https://zod.dev/) 创建了一些简单的 Schema 作为丝线，你可以在[Zod 集成](../schema-integration/zod)章节中了解如何使用 [Zod](https://zod.dev/) 创建更复杂的类型。