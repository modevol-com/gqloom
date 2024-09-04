# GQLoom

[English](./README.md) | 简体中文

GQLoom 是一个用于 TypeScript/JavaScript 的 GraphQL 编织器，使用 Zod、Yup 或者 Valibot 来愉快地编织 GraphQL Schema, 支持完善的类型推断以提供最好的开发体验。

# GQLoom Mikro ORM

[MikroORM](https://mikro-orm.io/) 是一个出色的 TypeScript ORM，支持多种数据库，如 MySQL、PostgreSQL、SQLite 等。
`@gqloom/mikro-orm` 提供了 GQLoom 与 MikroORM 的集成。

- 使用 MikroORM 的 Entity Schema 作为丝线；
- 将丝线编织成 MikroORM 的 Entity Schema；
- 从 MikroORM 的 Entity Schema 生成 GraphQL 操作。

## 使用 MikroORM 的 Entity Schema 作为丝线

使用 `mikroSilk` 方法将 MikroORM 的 Entity Schema 作为丝线：

```ts
interface IBook {
  ISBN: string
  sales: number
  title: string
  isPublished: boolean
  price: number
  tags: string[]
  author: Ref<IAuthor>
}

interface IAuthor {
  name: string
}

const Author = mikroSilk(
  new EntitySchema<IAuthor>({
    name: "Author",
    properties: {
      name: { type: "string" },
    },
  })
)

const Book = mikroSilk(
  new EntitySchema<IBook>({
    name: "Book",
    properties: {
      ISBN: { type: "string", primary: true },
      sales: { type: "number", hidden: false },
      title: { type: "string" },
      isPublished: { type: Boolean },
      price: { type: "number", nullable },
      tags: { type: "string[]", array: true },
      author: { entity: () => Author, kind: "m:1", ref: true },
    },
  }),
  { description: "A book" }
)
```

### 自定义类型映射

为了适应更多的数据库列类型，我们可以拓展 GQLoom 为其添加更多的类型映射。

首先我们使用 `MikroWeaver.config` 来类型映射的配置。这里我们导入来自 `graphql-scalars` 的 `GraphQLDateTime` 和 `GraphQLJSONObject` 标量，当遇到 `date`、`jsonb` 类型时，我们将其映射到对应的 GraphQL 标量。

```ts
import { GraphQLDateTime, GraphQLJSONObject } from "graphql-scalars"
import { MikroWeaver } from "@gqloom/mikro-orm"

const mikroWeaverConfig = MikroWeaver.config({
  presetGraphQLType: (property: EntityProperty) => {
    switch (MikroWeaver.extractSimpleType(property.type)) {
      case "date":
        return GraphQLDateTime
      case "json":
        return GraphQLJSONObject
    }
  },
})
```

## 将丝线编织成 MikroORM 的 Entity Schema

### 自定义类型映射

## 从 MikroORM 的 Entity Schema 生成 GraphQL 操作

```

```
