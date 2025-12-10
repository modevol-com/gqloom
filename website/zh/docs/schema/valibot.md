# Valibot

[Valibot](https://valibot.dev/) 是一个通用的数据验证库，考虑了捆绑包大小、类型安全和开发体验。

`@gqloom/valibot` 提供了 GQLoom 与 Valibot 的集成，以便将 Valibot Schema 编织成 GraphQL Schema。

## 安装

<!--@include: @/snippets/install-valibot.md-->

## 定义简单标量

在 GQLoom 中，可以直接将 Valibot Schema 作为[丝线](../silk)使用：

```ts twoslash
import * as v from "valibot"

const StringScalar = v.string() // GraphQLString

const BooleanScalar = v.boolean() // GraphQLBoolean

const FloatScalar = v.number() // GraphQLFloat

const IntScalar = v.pipe(v.number(), v.integer()) // GraphQLInt
```

## 编织

为了让 `GQLoom` 能正确地将 Valibot Schema 编织到 GraphQL Schema，我们在使用 `weave` 函数时，需要添加来自 `@gqloom/valibot` 的 `ValibotWeaver`。

```ts twoslash
import { weave, resolver, query } from "@gqloom/core"
import { ValibotWeaver } from "@gqloom/valibot"
import * as v from "valibot"

export const helloResolver = resolver({
  hello: query(v.string(), () => "Hello, World!"),
})

export const schema = weave(ValibotWeaver, helloResolver)
```

## 定义对象

我们可以使用 Valibot 定义对象，并将其作为[丝线](../silk)使用：

```ts twoslash
import * as v from "valibot"

export const Cat = v.object({
  __typename: v.nullish(v.literal("Cat")),
  name: v.string(),
  age: v.pipe(v.number(), v.integer()),
  loveFish: v.nullish(v.boolean()),
})
```

## 名称和更多元数据

### 为对象定义名称

<!--@include: ./parts/naming.info.md-->

最推荐的实践是使用 `__typename` 字面量来为对象定义名称，比如：

```ts twoslash
import * as v from "valibot"

export const Cat = v.object({
  __typename: v.nullish(v.literal("Cat")),
  name: v.string(),
  age: v.pipe(v.number(), v.integer()),
  loveFish: v.nullish(v.boolean()),
})
```

也可使用 `__typename` 必填字面量来设置具体的值，这在使用 GraphQL `interface` 和 `union` 时非常有用，比如：

```ts twoslash
import * as v from "valibot"

export const Cat = v.object({
  __typename: v.literal("Cat"),
  name: v.string(),
  age: v.pipe(v.number(), v.integer()),
  loveFish: v.nullish(v.boolean()),
})
```

::: details 使用 `collectNames`

我们可以使用 `collectNames` 函数来为对象定义名称。`collectNames` 函数接受一个对象，该对象的键是对象的名称，值是对象本身。

```ts twoslash
import { collectNames } from "@gqloom/core"
import * as v from "valibot"

export const Cat = v.object({
  name: v.string(),
  age: v.pipe(v.number(), v.integer()),
  loveFish: v.nullish(v.boolean()),
})

collectNames({ Cat }) // 为 Cat 收集名称，在编织后将呈现在 GraphQL Schema 中
```

我们也可以使用 `collectNames` 函数来为对象定义名称，并将返回的对象解构为 `Cat` 并导出。

```ts twoslash
import { collectNames } from "@gqloom/core"
import * as v from "valibot"

export const { Cat } = collectNames({
  Cat: v.object({
    name: v.string(),
    age: v.pipe(v.number(), v.integer()),
    loveFish: v.nullish(v.boolean()),
  }),
})
```
:::

::: details 使用 `asObjectType`

我们可以使用 `asObjectType` 函数创建一个元数据并将其传入 `Valibot` 管道中来为对象定义名称。`asObjectType` 函数接受完整的 GraphQL 对象类型定义，并返回一个元数据。

```ts twoslash
import { asObjectType } from "@gqloom/valibot"
import * as v from "valibot"

export const Cat = v.pipe(
  v.object({
    name: v.string(),
    age: v.pipe(v.number(), v.integer()),
    loveFish: v.nullish(v.boolean()),
  }),
  asObjectType({ name: "Cat" })
)
```
:::

### 添加更多元数据

通过 `asObjectType` 函数，我们可以为对象添加更多元数据，例如 `description`、`deprecationReason`、`extensions` 等。

```ts twoslash
import { asObjectType } from "@gqloom/valibot"
import * as v from "valibot"

export const Cat = v.pipe(
  v.object({
    name: v.string(),
    age: v.pipe(v.number(), v.integer()),
    loveFish: v.nullish(v.boolean()),
  }),
  asObjectType({ // [!code highlight]
    name: "Cat", // [!code highlight]
    description: "A cute cat", // [!code highlight]
  }) // [!code highlight]
)
```

在上面的代码中，我们为 `Cat` 对象添加了一个 `description` 元数据，该元数据将在 GraphQL Schema 中呈现：

```graphql title="GraphQL Schema"
"""A cute cat"""
type Cat {
  name: String!
  age: Int!
  loveFish: Boolean
}
```

我们还可以使用 `asField` 函数为字段添加元数据，例如 `description`、`type` 等。

```ts twoslash
import { asObjectType, asField } from "@gqloom/valibot"
import { GraphQLInt } from "graphql"
import * as v from "valibot"

export const Cat = v.pipe(
  v.object({
    name: v.string(),
    age: v.pipe(
      v.number(),
      asField({ // [!code highlight]
        type: GraphQLInt, // [!code highlight]
        description: "How old is the cat", // [!code highlight]
        extensions: { // [!code highlight]
          complexity: 2, // [!code highlight]
        }, // [!code highlight]
      }) // [!code highlight]
    ),
    loveFish: v.nullish(v.boolean()),
  }),
  asObjectType({
    name: "Cat",
    description: "A cute cat",
  })
)
```

在上面的代码中，我们为 `age` 字段添加了 `type` 和 `description` 元数据，最终得到如下 GraphQL Schema：

```graphql title="GraphQL Schema"
"""A cute cat"""
type Cat {
  name: String!

  """How old is the cat"""
  age: Int
  loveFish: Boolean
}
```

#### 声明接口

我们可以使用 `asObjectType` 函数来声明接口，例如：
```ts twoslash
import { asObjectType } from "@gqloom/valibot"
import * as v from "valibot"

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
在上面的代码中，我们使用 `asObjectType` 函数创建了一个接口 `Fruit`，并使用 `interfaces` 选项将 `Orange` 对象声明为 `Fruit` 接口的实现。

#### 省略字段

我们还可以使用 `asField` 函数将 `type` 设置为 `null` 来省略字段，例如：

```ts twoslash
import { asField } from "@gqloom/valibot"
import * as v from "valibot"

const Dog = v.object({
  __typename: v.nullish(v.literal("Dog")),
  name: v.nullish(v.string()),
  birthday: v.pipe(v.nullish(v.date()), asField({ type: null })),
})
```

将得到如下 GraphQL Schema：

```graphql title="GraphQL Schema"
type Dog {
  name: String
}
```

## 定义联合类型

在使用 `Valibot` 时，我们可以使用 `variant` 或 `union` 定义联合类型。

#### 使用 variant

我们推荐使用 `variant` 来定义联合类型：

```ts twoslash
import { asUnionType } from "@gqloom/valibot"
import * as v from "valibot"

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

在上面的代码中，我们使用 `variant` 函数创建了一个联合类型。对于 `Animal` 来说，它通过 `__typename` 字段来区分具体的类型。

#### 使用 union

我们还可以使用 `union` 来定义联合类型：

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

在上面的代码中，我们使用 `union` 函数创建了一个联合类型。对于 `Animal` 来说，它通过 `resolveType` 函数来区分具体的类型。
在这里，如果一个动物它喜欢鱼，那么它就是一只猫，否则就是一只狗。

## 定义枚举类型

我们可以使用 `v.picklist` 或 `v.enum_` 定义枚举类型。

#### 使用 picklist

通常，我们更推荐使用 `v.picklist` 来定义枚举类型：

```ts twoslash
import { asEnumType } from "@gqloom/valibot"
import * as v from "valibot"

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

#### 使用 enum_

我们也可以使用 `v.enum_` 来定义枚举类型：

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

## 自定义类型映射

为了适应更多的 Valibot 类型，我们可以拓展 GQLoom 为其添加更多的类型映射。

首先我们使用 `ValibotWeaver.config` 来定义类型映射的配置。  
这里我们导入来自 [graphql-scalars](https://the-guild.dev/graphql/scalars) 的 `GraphQLDateTime`、`GraphQLJSON` 和 `GraphQLJSONObject` 标量，当遇到 `date`、`any` 和 `record` 类型时，我们将其映射到对应的 GraphQL 标量。

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

在编织 GraphQL Schema 时传入配置到 `weave` 函数中：

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

## 默认类型映射

下表列出了 GQLoom 中 Valibot 类型与 GraphQL 类型之间的默认映射关系：

| Valibot 类型                      | GraphQL 类型        |
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
| `v.pipe(v.string(), v.nanoid())`  | `GraphQLID`         |
| `v.pipe(v.string(), v.ulid())`    | `GraphQLID`         |
| `v.pipe(v.string(), v.uuid())`    | `GraphQLID`         |
| `v.union()`                       | `GraphQLUnionType`  |
| `v.variant()`                     | `GraphQLUnionType`  |
