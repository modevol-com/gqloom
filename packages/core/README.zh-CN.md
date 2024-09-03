# GQLoom

GQLoom 是一个用于 TypeScript/JavaScript 的 GraphQL 编织器，使用 Zod、Yup 或者 Valibot 来愉快地编织 GraphQL Schema, 支持完善的类型推断以提供最好的开发体验。

## 你好，世界！

```ts
import { weave, loom, silk } from "@gqloom/core"
import { GraphQLString } from "graphql"

const HelloResolver = loom.resolver({
  hello: loom.query(silk(GraphQLString), () => "world"),
})

export const schema = weave(HelloResolver)
```

# GQLoom Core

GQLoom Core 是 GQLoom 的核心库，提供了 GQLoom 的基础功能。

## 概念

GQLoom 意为 GraphQL 的织布机（Loom），其核心理念是从各式Schema 编织出 GraphQL Schema。

### 丝线｜Silk

丝线是 GQLoom 的基础单位，它同时反应 GraphQL 类型和 TypeScript 类型。
我们可以通过 `silk` 函数创建丝线：

##### 简单的标量丝线

```ts
import { silk } from "@gqloom/core"
import { GraphQLString, GraphQLInt } from "graphql"

const StringSilk = silk(GraphQLString)
const IntSilk = silk(GraphQLInt)
```

##### 携带类型的对象丝线

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

// 这里我们使用 `silk`的泛型参数将 CatSilk 的类型标记为 ICat
export const Cat = silk<ICat>(
  new GraphQLObjectType({
    name: "Cat",
    fields: {
      name: { type: new GraphQLNonNull(GraphQLString) },
      age: { type: new GraphQLNonNull(GraphQLInt) },
    },
  })
)
```

直接使用 [graphql.js](https://graphql.org/graphql-js/constructing-types/) 构造 GraphQL 类型可能导致冗长的代码，并且需要手动为丝线添加类型声明。
使用 Zod、Valibot 可以更轻松地创建丝线。

##### 使用 Zod 创建丝线

```ts
import { zodSilk } from "@gqloom/zod"
import { z } from "zod"

const Cat = zodSilk(
  z.object({
    __typename: z.literal("Cat").nullish(), // 定义 GraphQL Object 的名称
    name: z.string(),
    age: z.number(),
  })
)
```

##### 使用 Valibot 创建丝线

```ts
import { valibotSilk } from "@gqloom/valibot"
import * as v from "valibot"

const Cat = valibotSilk(
  v.object({
    __typename: v.nullish(v.literal("Cat")), // 定义 GraphQL Object 的名称
    name: v.string(),
    age: v.number(),
  })
)
```

### 解析器｜Resolver

解析器是放置 GraphQL 操作（Query、Mutation、Subscription）的地方，GQLoom 会将各个解析器汇总编织成 GraphQL Schema。

```ts
import { loom, silk } from "@gqloom/core"
import { GraphQLString } from "graphql"

const { resolver, query, mutation } = loom

const HelloResolver = resolver({
  hello: query(silk(GraphQLString), () => "world"),
  bye: mutation(silk(GraphQLString), {
    description: "say bye",
    resolve: () => "see you later",
  }),
})
```

解析器内可以存放多个操作。操作通过 `query`、`mutation`或`subscription` 函数创建，它们接受两个参数：

- 1. 丝线：定义了操作返回值的类型；
- 2. 解析函数以及更多配置：定义了操作的具体逻辑、输入类型及其他配置。

#### 带输入的解析操作

为 GraphQL 操作添加输入类型，只需要在解析函数中添加一个 `input` 参数即可。

```ts
import { loom, silk } from "@gqloom/core"
import { GraphQLString } from "graphql"

const { resolver, query } = loom

const GreetingResolver = resolver({
  greet: query(silk(GraphQLString), {
    input: { name: silk(GraphQLString) },
    resolve: ({ name }) => `Hello, ${name}!`,
  }),
})
```

在以上代码中，我们定义了一个 `greet` 操作，它接受一个 `name` 作为输入，然后我们可以在 `resolve` 函数中轻松获取到 `name` 的值。

#### 为对象添加更多字段

我们可以使用 `field` 函数在解析器内为对象添加额外的字段。

```ts
import { loom, silk } from "@gqloom/core"
import { GraphQLInt } from "graphql"
import { Cat } from "./schemas"

const CatResolver = resolver.of(Cat, {
  cat: query(Cat, () => ({
    name: "Tom",
    birthday: "2020-01-01",
  })),

  // 我们可以在解析函数的第一个参数获取到 `Cat` 实例的值
  age: field(silk(GraphQLInt), (cat) => {
    return new Date().getFullYear() - new Date(cat.birthday).getFullYear()
  }),

  ageAt: field(silk(GraphQLInt), {
    input: { year: silk(GraphQLInt) },
    // 当字段包含输入时，我们可以在第二个参数中获取到输入的值
    resolve: (cat, { year }) => {
      return year - new Date(cat.birthday).getFullYear()
    },
  }),

  // 在对象之间建立关联
  friend: field(Cat, () => ({
    name: "Jerry",
    birthday: "2020-01-01",
  })),
})
```

### 编织器｜Weaver

使用 `weave` 函数将解析器编织成 GraphQL Schema。
`weave` 能够接受解析器、丝线、中间件、各式配置作为输入，将在之后介绍。

```ts
import { weave } from "@gqloom/core"
import { HelloResolver } from "./resolvers"

export const schema = weave(HelloResolver, GreetingResolver)
```
