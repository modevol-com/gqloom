# Effect

[Effect](https://effect.website/docs/essentials/Schema) 的 `Schema` 可同时描述类型与运行时校验。`@gqloom/effect` 将 Effect Schema 编织为 GraphQL Schema，并复用已有的元数据（title/description/annotations）。

## 安装

<!--@include: @/snippets/install-effect.md-->

## 定义简单标量

在 GQLoom 中，可以直接把 Effect Schema 作为[丝线](../silk)使用：

```ts twoslash
import { Schema } from "effect"

const standard = Schema.standardSchemaV1

const StringScalar = standard(Schema.String) // GraphQLString

const BooleanScalar = standard(Schema.Boolean) // GraphQLBoolean

const FloatScalar = standard(Schema.Number) // GraphQLFloat

const IntScalar = standard(Schema.Int) // GraphQLInt

const IDScalar = standard(Schema.String.annotations({ identifier: "UUID" })) // GraphQLID
```

## 编织 | Weave

使用 `EffectWeaver` 让 GQLoom 认识 Effect Schema：

```ts twoslash
import { weave, resolver, query } from "@gqloom/core"
import { EffectWeaver } from "@gqloom/effect"
import { Schema } from "effect"

const standard = Schema.standardSchemaV1

export const helloResolver = resolver({
  hello: query(standard(Schema.String), () => "Hello, World!"),
})

export const schema = weave(EffectWeaver, helloResolver)
```

## 定义对象

```ts twoslash
import { Schema } from "effect"

export const Cat = Schema.Struct({
  __typename: Schema.optional(Schema.Literal("Cat")),
  name: Schema.String,
  age: Schema.Int,
  loveFish: Schema.NullOr(Schema.Boolean),
})
```

## 名称和更多元数据

<!--@include: ./parts/naming.info.md-->

### 为对象定义名称

最推荐的实践是使用 Effect Schema 内置的 `annotations()` 中的 `title` 元数据来为对象定义名称，比如：

```ts twoslash
import { Schema } from "effect"

export const Cat = Schema.Struct({
  name: Schema.String,
  age: Schema.Int,
  loveFish: Schema.NullOr(Schema.Boolean),
}).annotations({
  title: "Cat",
})
```

也可使用 `__typename` 字面量来设置具体的值，这在使用 GraphQL `interface` 和 `union` 时非常有用，比如：

```ts twoslash
import { Schema } from "effect"

export const Cat = Schema.Struct({
  __typename: Schema.Literal("Cat"), // 必填且限定为 "Cat"
  name: Schema.String,
  age: Schema.Int,
  loveFish: Schema.NullOr(Schema.Boolean),
})
```

::: details 使用 `collectNames`

我们可以使用 `collectNames` 函数来为对象定义名称。`collectNames` 函数接受一个对象，该对象的键是对象的名称，值是对象本身。

```ts twoslash
import { collectNames } from "@gqloom/core"
import { Schema } from "effect"

export const Cat = Schema.Struct({
  name: Schema.String,
  age: Schema.Int,
  loveFish: Schema.NullOr(Schema.Boolean),
})

collectNames({ Cat })
```

我们也可以使用 `collectNames` 函数来为对象定义名称，并将返回的对象解构为 `Cat` 并导出。

```ts twoslash
import { collectNames } from "@gqloom/core"
import { Schema } from "effect"

export const { Cat } = collectNames({
  Cat: Schema.Struct({
    name: Schema.String,
    age: Schema.Int,
    loveFish: Schema.NullOr(Schema.Boolean),
  }),
})
```
:::

### 添加更多元数据

```ts twoslash
import { Schema } from "effect"
import { asField, asObjectType } from "@gqloom/effect"
import { GraphQLInt } from "graphql"

export const Cat = Schema.Struct({
  name: Schema.String,
  age: Schema.Int.annotations({
    [asField]: { // [!code highlight]
      type: GraphQLInt, // [!code highlight]
      description: "How old is the cat", // [!code highlight]
      extensions: { // [!code highlight]
        complexity: 2, // [!code highlight]
      }, // [!code highlight]
    }, // [!code highlight]
  }),
  loveFish: Schema.NullOr(Schema.Boolean),
}).annotations({
  [asObjectType]: { name: "Cat", description: "A cute cat" },
})
```

生成的 GraphQL Schema：

```graphql title="GraphQL Schema"
"""A cute cat"""
type Cat {
  name: String!

  """How old is the cat"""
  age: Int
  loveFish: Boolean
}
```

### 声明接口

```ts twoslash
import { Schema } from "effect"
import { asObjectType } from "@gqloom/effect"

const Node = Schema.Struct({
  __typename: Schema.optional(Schema.Literal("Node")),
  id: Schema.String,
}).annotations({
  title: "Node",
  description: "Node interface",
})

const User = Schema.Struct({
  __typename: Schema.optional(Schema.Literal("User")),
  id: Schema.String,
  name: Schema.String,
}).annotations({
  title: "User",
  [asObjectType]: { interfaces: [Node] },
})
```

### 省略字段

将 `asField` 的 `type` 设为 `null` 或使用 `field.hidden` 可以让字段不出现在 GraphQL：

```ts twoslash
import { Schema } from "effect"
import { asField } from "@gqloom/effect"

const Dog = Schema.Struct({
  __typename: Schema.optional(Schema.Literal("Dog")),
  name: Schema.optional(Schema.String),
  birthday: Schema.optional(Schema.Date).annotations({
    [asField]: { type: null },
  }),
})
```

## 定义联合类型

推荐为联合命名并附带描述：

```ts twoslash
import { Schema } from "effect"
import { asUnionType } from "@gqloom/effect"

const Cat = Schema.Struct({
  __typename: Schema.Literal("Cat"),
  meow: Schema.String,
})

const Dog = Schema.Struct({
  __typename: Schema.Literal("Dog"),
  bark: Schema.String,
})

const Animal = Schema.Union(Cat, Dog).annotations({
  title: "Animal",
  description: "An animal union type",
})
```

`EffectWeaver` 会验证联合成员必须是对象类型，并自动去除 `null/void`/可选成员的影响。

## 定义枚举类型

使用 `Schema.Enums` 并可附带 GraphQL 枚举元数据：

```ts twoslash
import { Schema } from "effect"
import { asEnumType } from "@gqloom/effect"

export const Role = Schema.Enums({
  Admin: "ADMIN",
  User: "USER",
}).annotations({
  title: "Role",
  [asEnumType]: {
    valuesConfig: {
      Admin: { description: "Administrator" },
      User: { description: "Regular user" },
    },
  },
})
```

## 自定义类型映射

用 `EffectWeaver.config` 可为特定 Schema 提供预设 GraphQL 类型：

```ts twoslash
import { Schema, SchemaAST } from "effect"
import { EffectWeaver } from "@gqloom/effect"
import { GraphQLDateTime, GraphQLJSON } from "graphql-scalars"
import { weave, resolver, query } from "@gqloom/core"

const standard = Schema.standardSchemaV1

export const effectWeaverConfig = EffectWeaver.config({
  presetGraphQLType: (schema) => {
    const identifier = SchemaAST.getAnnotation<string>(
      SchemaAST.IdentifierAnnotationId
    )(schema.ast).pipe((o) => (o._tag === "Some" ? o.value : null))

    if (identifier?.includes("Date")) return GraphQLDateTime
    if (identifier === "Any" || identifier === "JSON") return GraphQLJSON
  },
})

export const helloResolver = resolver({
  hello: query(standard(Schema.String), () => "Hello, World!"),
})

export const schema = weave(effectWeaverConfig, helloResolver)
```

## 默认类型映射

下表列出了 GQLoom 中 Effect Schema 与 GraphQL 类型的默认映射关系（`Schema.NullOr` / `Schema.optional` 会映射为可空类型，其他情况默认加 `GraphQLNonNull` 包裹）：

| Effect 类型/特征                         | GraphQL 类型        |
| ---------------------------------------- | ------------------- |
| `Schema.Array` / Tuple（首元素）         | `GraphQLList`       |
| `Schema.String`                          | `GraphQLString`     |
| `identifier` 包含 `uuid`/`ulid`          | `GraphQLID`         |
| `Schema.Literal("")`                     | `GraphQLString`     |
| `Schema.Literal(false)`                  | `GraphQLBoolean`    |
| `Schema.Literal(0)`                      | `GraphQLFloat`      |
| `Schema.Number`                          | `GraphQLFloat`      |
| `Schema.Int` / `Schema.Number` + `int()` | `GraphQLInt`        |
| `Schema.Boolean`                         | `GraphQLBoolean`    |
| `Schema.Date` / `identifier` 含 `Date`   | `GraphQLString`     |
| `Schema.Struct` / `Schema.Record`        | `GraphQLObjectType` |
| `Schema.Enums`                           | `GraphQLEnumType`   |
| `Schema.Union`（对象联合）               | `GraphQLUnionType`  |
| `Schema.suspend` / 循环引用              | 正常解析为对应类型  |
