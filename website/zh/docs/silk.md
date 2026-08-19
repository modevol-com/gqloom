<script setup>
import { Tabs } from "@/components/tabs.tsx"
</script>

# 丝线（Silk）

丝线（Silk）是 GraphQL 纺织机的基本原料，它同时反应 GraphQL 类型和 TypeScript 类型。
在开发时，我们使用现有的模式库的 Schema 作为丝线，最终 `GQLoom` 会将丝线编织进 GraphQL Schema。

## 简单的标量丝线

我们可以使用 `silk` 函数创建一个简单的标量丝线：

```ts twoslash
import { silk } from "@gqloom/core"
import { GraphQLString, GraphQLInt, GraphQLNonNull } from "graphql"

const StringSilk = silk(GraphQLString)
const IntSilk = silk(GraphQLInt)

const NonNullStringSilk = silk(new GraphQLNonNull(GraphQLString))
const NonNullStringSilk1 = silk.nonNull(StringSilk)
```

## 对象丝线

我们可以直接使用 [graphql.js](https://graphql.org/graphql-js/constructing-types/) 构造 GraphQL 对象：

```ts twoslash
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

const Cat = silk(
  new GraphQLObjectType<ICat>({
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

```graphql title="GraphQL Schema"
type Cat {
  name: String!
  age: Int!
}
```

你可能注意到了，使用 `graphql.js` 来创建丝线需要同时声明 `ICat` 接口和 `GraphQLObjectType`，也就是说，我们为 `Cat` 创建了两份定义。
重复的定义让代码损失了简洁性，也增加了维护成本。

## 使用 Schema 库创建丝线

好在，我们有像 [Valibot](https://valibot.dev/)、[Zod](https://zod.dev/) 这样的 Schema 库，它们创建的 Schema 将携带 TypeScript 类型，并在运行时仍然携带类型。
`GQLoom` 可以直接使用这些 Schema 作为丝线，而不需要重复定义。

`GQLoom` 目前已经集成来自以下库的 Schema：

- [Valibot](./schema/valibot.md)
- [Zod](./schema/zod.md)
- [JSON Schema](./schema/json.md)
- [Yup](./schema/yup.md)
- [Effect Schema](./schema/effect.md)
- [Mikro ORM](./schema/mikro-orm.md)
- [Drizzle](./schema/drizzle.md)
- [Prisma](./schema/prisma.md)

另外，还有一些库可借由 JSON Schema 作为丝线，如 [TypeBox](https://sinclairzx81.github.io/typebox/)、[ArkType](https://arktype.io/) 等。

<Tabs groupId="schema-library">
<template #Valibot>

```ts twoslash
import * as v from "valibot"

const StringSilk = v.string()

const BooleanSilk = v.boolean()

const Cat = v.object({
  __typename: v.literal("Cat"),
  name: v.string(),
  age: v.number(),
})
```

我们可以直接将 Valibot Schema 作为丝线使用，但不要忘记在[编织](./weave.md)时添加来自 `@gqloom/valibot` 的 `ValibotWeaver`。

```ts twoslash
import { type Loom } from "@gqloom/core"
const resolvers: Loom.Resolver[] = []
// ---cut---
import { weave } from "@gqloom/core"
import { ValibotWeaver } from "@gqloom/valibot"

export const schema = weave(ValibotWeaver, ...resolvers)
```

</template>
<template #Zod>

```ts twoslash
import * as z from "zod"

const StringSilk = z.string()

const BooleanSilk = z.boolean()

const Cat = z.object({
  __typename: z.literal("Cat"),
  name: z.string(),
  age: z.number(),
})
```

我们可以直接将 Zod Schema 作为丝线使用，但不要忘记在[编织](./weave.md)时添加来自 `@gqloom/zod` 的 `ZodWeaver`。

```ts twoslash
import { type Loom } from "@gqloom/core"
const resolvers: Loom.Resolver[] = []
// ---cut---
import { weave } from "@gqloom/core"
import { ZodWeaver } from "@gqloom/zod"

export const schema = weave(ZodWeaver, ...resolvers)
```

</template>
<template #JSON_Schema>

我们需要借助 `@gqloom/json` 中的 `jsonSilk` 函数将 JSON Schema 作为丝线使用：

```ts twoslash
import { jsonSilk } from "@gqloom/json"

const StringSilk = jsonSilk({ type: "string" })

const BooleanSilk = jsonSilk({ type: "boolean" })

const Cat = jsonSilk({
  title: "Cat",
  type: "object",
})
```

</template>
<template #Yup>

```ts twoslash
import * as yup from "yup"

const StringSilk = yup.string()
const BooleanSilk = yup.boolean()
const Cat = yup.object({
  name: yup.string(),
  age: yup.number(),
}).label("Cat")
```

我们可以直接将 Yup Schema 作为丝线使用，但不要忘记在[编织](./weave.md)时添加来自 `@gqloom/yup` 的 `YupWeaver`。

```ts twoslash
import { type Loom } from "@gqloom/core"
const resolvers: Loom.Resolver[] = []
// ---cut---
import { weave } from "@gqloom/core"
import { YupWeaver } from "@gqloom/yup"

export const schema = weave(YupWeaver, ...resolvers)
```

</template>
<template #TypeBox>

为了让 TypeBox Schema 作为丝线使用，我们需要借助 `@gqloom/json` 为 TypeBox Schema 定义一个包装函数：

```ts twoslash
import { type GraphQLSilk } from "@gqloom/core"
import { JSONWeaver } from "@gqloom/json"
import { type Static, type Type } from "typebox"

function typeSilk<T extends Type.TSchema>(
  type: T
): T & GraphQLSilk<Type.Static<T>, Type.Static<T>> {
  return JSONWeaver.unravel(type) as T &
    GraphQLSilk<Type.Static<T>, Type.Static<T>>
}
```

随后我们可以使用 `typeSilk` 函数将 TypeBox Schema 作为丝线使用：

```ts twoslash
import { type GraphQLSilk } from "@gqloom/core"
import { JSONWeaver } from "@gqloom/json"
import { type TSchema, type Static } from "typebox"

function typeSilk<T extends Type.TSchema>(
  type: T
): T & GraphQLSilk<Type.Static<T>, Type.Static<T>> {
  return JSONWeaver.unravel(type) as T &
    GraphQLSilk<Type.Static<T>, Type.Static<T>>
}
// ---cut---
import { Type } from "typebox"

const StringSilk = typeSilk(Type.String())

const BooleanSilk = typeSilk(Type.Boolean())

const Cat = typeSilk(Type.Object({ 
  __typename: Type.Optional(Type.Literal("Cat")),
  name: Type.String(), 
  age: Type.Integer(),
}))
```

</template>
<template #ArkType>

```ts twoslash
import { type } from "arktype"

const StringSilk = type("string")

const BooleanSilk = type("boolean")

const Cat = type({
  "__typename?": "'Cat' | null",
  name: "string",
  age: "number",
})
```

我们需要借助 `@gqloom/json` 自定义一个 `arkTypeWeaver` 来将 ArkType 的 Schema 作为丝线使用：

```ts twoslash
import { type Loom } from "@gqloom/core"
const resolvers: Loom.Resolver[] = []
// ---cut---
import { type SchemaWeaver, weave } from "@gqloom/core"
import { type JSONSchema, JSONWeaver } from "@gqloom/json"
import { type Type } from "arktype"

const arkTypeWeaver: SchemaWeaver = {
  vendor: "arktype",
  getGraphQLType: (type: Type) => {
    return JSONWeaver.getGraphQLType(type.toJsonSchema() as JSONSchema, {
      source: type,
    })
  },
}

export const schema = weave(arkTypeWeaver, ...resolvers)
```

</template>
<template #Effect_Schema>

```ts twoslash
import { Schema } from "effect"

const StringSilk = Schema.standardSchemaV1(Schema.String)

const BooleanSilk = Schema.standardSchemaV1(Schema.Boolean)

const Cat = Schema.standardSchemaV1(Schema.Struct({
  name: Schema.String,
  age: Schema.Int,
}).annotations({ title: "Cat" }))
```

我们可以直接将 Effect Schema 作为丝线使用，但不要忘记在[编织](./weave.md)时添加来自 `@gqloom/effect` 的 `EffectWeaver`。

```ts twoslash
import { type Loom } from "@gqloom/core"
const resolvers: Loom.Resolver[] = []
// ---cut---
import { weave } from "@gqloom/core"
import { EffectWeaver } from "@gqloom/effect"

export const schema = weave(EffectWeaver, ...resolvers)
```
</template>
</Tabs>