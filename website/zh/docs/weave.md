# 编织（Weave）

在 GQLoom 中，`weave` 函数用于将多个解析器（Resolver）或丝线（Silk）编织到一张 GraphQL Schema 中。

`weave` 函数可以接收[解析器](./resolver)、[丝线](./silk)、编织器配置、全局[中间件](./middleware)

## 编织解析器
最常见的用法是将多个解析器编织到一起，例如：

```ts
import { weave } from '@gqloom/core';

export const schema = weave(helloResolver, catResolver);
```

## 编织单独丝线

有时候，我们需要将一个单独的[丝线](./silk.md)编织到 GraphQL Schema 中，例如：

::: code-group
```ts twoslash [valibot]
import { resolver, query, mutation, field } from '@gqloom/core'

const helloResolver = resolver({
  hello: query(v.string(), () => "Hello, World"),
})

const Cat = v.object({
  __typename: v.nullish(v.literal("Cat")),
  name: v.string(),
  birthDate: v.string(),
})

const catResolver = resolver({
  createCat: mutation(Cat, {
    input: {
      data: Cat,
    },
    resolve: ({ data }) => data,
  }),
})
// ---cut---
import { weave } from '@gqloom/core'
import { ValibotWeaver } from '@gqloom/valibot'
import * as v from "valibot"

const Dog = v.object({
  __typename: v.nullish(v.literal("Dog")),
  name: v.string(),
  age: v.number(),
})

export const schema = weave(ValibotWeaver, helloResolver, catResolver, Dog);
```

```ts twoslash [zod]
import { resolver, query, mutation, field } from '@gqloom/core'

const helloResolver = resolver({
  hello: query(z.string(), () => "Hello, World"),
})

const Cat = z.object({
  __typename: z.literal("Cat").nullish(),
  name: z.string(),
  birthDate: z.string(),
})

const catResolver = resolver({
  createCat: mutation(Cat, {
    input: {
      data: Cat,
    },
    resolve: ({ data }) => data,
  }),
})
// ---cut---
import { weave } from '@gqloom/core'
import { ZodWeaver } from '@gqloom/zod'
import * as z from "zod"

const Dog = z.object({
  __typename: z.literal("Dog").nullish(),
  name: z.string(),
  age: z.number(),
})

export const schema = weave(ZodWeaver, helloResolver, catResolver, Dog);
```
:::

## 编织器配置

### 输入类型命名转换
在 GraphQL 中，对象分为 [type](https://graphql.org/graphql-js/object-types/) 和 [input](https://graphql.org/graphql-js/mutations-and-input-types/) 类型。

而使用 `GQLoom` 时，我们一般只使用 `object` 类型，在幕后 `GQLoom` 会自动将 `object` 类型转换为 `input` 类型。
这样做的好处是我们可以直接使用 `object` 类型来定义输入参数，而无需手动定义 `input` 类型。
但是当我们将同一个 `object` 类型同时用于 `type` 和 `input` 时，将因为命名冲突而无法编织成 GraphQL Schema。

让我们来看一个例子：

::: code-group
```ts twoslash [valibot]
import { resolver, mutation, weave } from '@gqloom/core'
import { ValibotWeaver } from '@gqloom/valibot'
import * as v from "valibot"

const Cat = v.object({
  __typename: v.nullish(v.literal("Cat")),
  name: v.string(),
  birthDate: v.string(),
})

const catResolver = resolver({
  createCat: mutation(Cat, {
    input: {
      data: Cat,
    },
    resolve: ({ data }) => data,
  }),
})

export const schema = weave(ValibotWeaver, catResolver);
```

```ts twoslash [zod]
import { resolver, mutation, weave } from '@gqloom/zod'
import { ZodWeaver } from '@gqloom/zod'
import * as z from "zod"

const Cat = z.object({
  __typename: z.literal("Cat").nullish(),
  name: z.string(),
  birthDate: z.string(),
})

const catResolver = resolver({
  createCat: mutation(Cat, {
    input: {
      data: Cat,
    },
    resolve: ({ data }) => data,
  }),
})

export const schema = weave(ZodWeaver, catResolver);
```
:::

在上面的代码中，我们定义了一个 `Cat` 对象，并将其用于 `type` 和 `input`。但是当我们尝试将 `catResolver` 编织到 GraphQL Schema 中时，会抛出一个错误，提示 `Cat` 名称重复：
```bash
Error: Schema must contain uniquely named types but contains multiple types named "Cat".
```

要解决这个问题，我们需要为 `input` 类型指定一个不同的名称。我们可以使用 `SchemaWeaver.config` 配置中的 `getInputObjectName` 选项来实现这一点：

::: code-group
```ts twoslash [valibot]
import { resolver, mutation, weave, GraphQLSchemaLoom } from '@gqloom/core'
import { ValibotWeaver } from '@gqloom/valibot'
import * as v from "valibot"

const Cat = v.object({
  __typename: v.nullish(v.literal("Cat")),
  name: v.string(),
  birthDate: v.string(),
})

const catResolver = resolver({
  createCat: mutation(Cat, {
    input: {
      data: Cat,
    },
    resolve: ({ data }) => data,
  }),
})

export const schema = weave(
  catResolver,
  ValibotWeaver,
  GraphQLSchemaLoom.config({ getInputObjectName: (name) => `${name}Input` }) // [!code hl]
)
```

```ts twoslash [zod]
import { resolver, mutation, weave, GraphQLSchemaLoom } from '@gqloom/core'
import * as z from "zod"

const Cat = z.object({
  __typename: z.literal("Cat").nullish(),
  name: z.string(),
  birthDate: z.string(),
})

const catResolver = resolver({
  createCat: mutation(Cat, {
    input: {
      data: Cat,
    },
    resolve: ({ data }) => data,
  }),
})

export const schema = weave(
  catResolver,
  GraphQLSchemaLoom.config({ getInputObjectName: (name) => `${name}Input` }) // [!code hl]
)
```
:::

如此一来，`Cat` 对象将被转换为 `CatInput` 类型，从而避免了命名冲突。

以上的 `catResolver` 将编织得到如下 GraphQL Schema：
```graphql title="GraphQL Schema"
type Mutation {
  createCat(data: CatInput!): Cat!
}

type Cat {
  name: String!
  birthDate: String!
}

input CatInput {
  name: String!
  birthDate: String!
}
```

## 全局中间件

```ts
import { weave } from '@gqloom/core';
import { logger } from './middlewares';

export const schema = weave(helloResolver, catResolver, logger)
```
在[中间件章节](./middleware)中查看更多关于中间件的用法。