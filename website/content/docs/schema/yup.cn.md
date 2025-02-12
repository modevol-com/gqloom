---
title: Yup
---

[Yup](https://github.com/jquense/yup) 是一个用于运行时值解析和验证的模式构建器。
您可以定义模式、转换值以匹配、断言现有值的形状，或两者兼而有之。
Yup 模式具有极强的表现力，可对复杂、相互依赖的验证或值转换进行建模。

`@gqloom/yup` 提供了 GQLoom 与 Yup 的集成，以便将 Yup Schema 编织成 GraphQL Schema。

## 安装

```sh tab="npm"
npm i @gqloom/core yup @gqloom/yup
```
```sh tab="pnpm"
pnpm add @gqloom/core yup @gqloom/yup
```
```sh tab="yarn"
yarn add @gqloom/core yup @gqloom/yup
```
```sh tab="bun"
bun add @gqloom/core yup @gqloom/yup
```

另外，我们还需要在项目中为 Yup 声明来自 GQLoom 的元数据：

```ts title="yup.d.ts"
import 'yup'
import { type GQLoomMetadata } from "@gqloom/yup"

declare module "yup" {
  export interface CustomSchemaMetadata extends GQLoomMetadata {}
}
```

## 定义简单标量

在 GQLoom 中，可以使用 `yupSilk` 将 Yup Schema 作为[丝线](../silk)使用：

```ts twoslash
import { number, string, boolean } from "yup"
import { yupSilk } from "@gqloom/yup"

const StringScalar = yupSilk(string())

const BooleanScalar = yupSilk(boolean())

const FloadtScalar = yupSilk(number())

const IntScalar = yupSilk(number().integer())
```

## 定义对象

我们可以使用 Yup 定义对象，并将其作为[丝线](../silk)使用：
```ts twoslash
import { string, boolean, object, number } from "yup"

export const Cat = object({
  name: string().required(),
  age: number().integer().required(),
  loveFish: boolean(),
}).label("Cat")
```

## 名称和更多元数据

### 为对象定义名称

#### 使用 `label()`

```ts twoslash
import { string, boolean, object, number } from "yup"

export const Cat = object({
  name: string().required(),
  age: number().integer().required(),
  loveFish: boolean(),
}).label("Cat")
```
在上面的代码中，我们使用 `label` 为对象定义了名称，这样在生成的 GraphQL Schema 中，该对象将具有名称 `Cat`。

#### 使用 `collectNames`

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

在上面的代码中，我们使用 `collectNames` 函数来为对象定义名称。`collectNames` 函数接受一个对象，该对象的键是对象的名称，值是对象本身。

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
在上面的代码中，我们使用 `collectNames` 函数来为对象定义名称，并将返回的对象解构为 `Cat` 并导出。

#### 使用 `asObjectType` 元数据

```ts twoslash
import { string, boolean, object, number } from "yup"

export const Cat = object({
  name: string().required(),
  age: number().integer().required(),
  loveFish: boolean(),
}).meta({ asObjectType: { name: "Cat" } })
```
在上面的代码中，我们在 Yup Schema 中使用 `meta` 函数来为对象定义名称。
在这里，我们定义了名称为 `asObjectType` 元数据，并将其设置为 `{ name: "Cat" }`，这样在生成的 GraphQL Schema 中，该对象将具有名称 `Cat`。

### 添加更多元数据

我们可以在 Yup Schema 中使用 `meta` 函数来添加更多元数据，例如 `description`、`deprecationReason`、`extensions` 等。
```ts twoslash
import { string, boolean, object, number } from "yup"

export const Cat = object({
  name: string().required(),
  age: number().integer().required(),
  loveFish: boolean(),
}).meta({ asObjectType: { name: "Cat", description: "A cute cat" } })
```

在上面的代码中，我们为 `Cat` 对象添加了 `description` 元数据，这样在生成的 GraphQL Schema 中，该对象将具有描述 `A cute cat`：

```graphql title="GraphQL Schema"
"""A cute cat"""
type Cat {
  name: String!
  age: Int!
  loveFish: Boolean
}
```

我们还可以使用元数据中的 `asField` 属性为字段添加元数据，例如 `description`、`type` 等：

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
    asField: { type: () => GraphQLInt, description: "How old is the cat" },
  }),
  loveFish: boolean(),
}).meta({ asObjectType: { name: "Cat", description: "A cute cat" } })
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

我们还可以使用 asObjectType 函数来声明接口，例如：
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
在上面的代码中，我们使用 `asObjectType` 中的 `interfaces` 属性将 `Orange` 对象声明为 `Fruit` 接口的实现。

#### 省略字段

我们还可以使用 asField 属性将 type 设置为 null 来省略字段，例如：
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
将得到如下 GraphQL Schema：
```graphql title="GraphQL Schema"
type Dog {
  name: String
}
```
## 定义联合类型

使用来自 `@gqloom/yup` 的 `union` 定义联合类型，例如：
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
在上面的代码中，我们使用 `union` 函数将 `Cat` 和 `Dog` 对象声明为 `Animal` 联合类型的成员。

## 定义枚举类型

#### 使用 `oneof()`

我们可以使用 `string().oneof()` 来定义枚举类型，例如：

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

#### 使用 `enum`

我们还可以使用 `enum` 来定义枚举类型，例如：
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

## 自定义类型映射

为了适应更多的 Yup 类型，我们可以拓展 GQLoom 为其添加更多的类型映射。

首先我们使用 `YupWeaver.config` 来定义类型映射的配置。这里我们导入来自 [graphql-scalars](https://the-guild.dev/graphql/scalars) 的 `GraphQLDateTime`，当遇到 `date` 类型时，我们将其映射到对应的 GraphQL 标量。
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

在编织 GraphQL Schema 时传入配置到 weave 函数中：
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

## 默认类型映射

下表列出了 GQLoom 中 Yup 类型与 GraphQL 类型之间的默认映射关系：

| Yup 类型                     | GraphQL 类型        |
| ---------------------------- | ------------------- |
| `string()`                   | `GraphQLString`     |
| `number()`                   | `GraphQLFloat`      |
| `number().integer()`         | `GraphQLInt`        |
| `boolean()`                  | `GraphQLBoolean`    |
| `object()`                   | `GraphQLObjectType` |
| `array()`                    | `GraphQLList`       |
| `union()`                    | `GraphQLUnionType`  |
| `string().oneof(["Value1"])` | `GraphQLEnumType`   |
