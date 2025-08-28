# Mikro ORM

::: warning
GQLoom 对于 Mikro ORM 的基础目前处于实验阶段。可能还缺失一些常用的功能。现有的功能还缺乏完善的测试。如果有任何问题，请随时在 [GitHub](https://github.com/modevol-com/gqloom/issues) 上报告。
:::

[MikroORM](https://mikro-orm.io/) 是一个出色的 TypeScript ORM，支持多种数据库，如 MySQL、PostgreSQL、SQLite 等。

`@gqloom/mikro-orm` 提供了 GQLoom 与 MikroORM 的集成：
- 使用 MikroORM 的 Entity Schema 作为丝线；
- 将丝线编织成 MikroORM 的 Entity Schema；
- 从 MikroORM 的 Entity Schema 生成 GraphQL 操作。

## 安装

::: code-group
```sh [npm]
npm i @gqloom/core @gqloom/mikro-orm @mikro-orm/core
```
```sh [pnpm]
pnpm add @gqloom/core @gqloom/mikro-orm @mikro-orm/core
```
```sh [yarn]
yarn add @gqloom/core @gqloom/mikro-orm @mikro-orm/core
```
```sh [bun]
bun add @gqloom/core @gqloom/mikro-orm @mikro-orm/core
```
:::

在 [Mikro ORM 文档](https://mikro-orm.io/docs/quick-start#installation)中，你可以找到更多关于安装的信息。

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

GQLoom 能够将丝线编织成 MikroORM 的 Entity Schema，这让我们用更少的代码定义 Entity Schema。
在下面的示例中，我们将使用 `Valibot` Schema 作为丝线定义 MikroORM 的 Entity Schema。

### 创建编织器

首先，我们需要先创建一个将 `Valibot` Schema 编织成 MikroORM 的 Entity Schema 的函数：

```ts
import {
  type CallableEntitySchemaWeaver,
  EntitySchemaWeaver,
} from "@gqloom/mikro-orm"
import {
  type ValibotSchemaIO,
  valibotSilk,
  ValibotWeaver,
} from "@gqloom/Valibot"

// 仅使用 `valibotSilk` 不添加额外配置
export const weaveEntitySchema: CallableEntitySchemaWeaver<ValibotSchemaIO> =
  EntitySchemaWeaver.createWeaver<ValibotSchemaIO>(valibotSilk)

// 使用带有额外配置的 `valibotSilk`
export const weaveEntitySchema1: CallableEntitySchemaWeaver<ValibotSchemaIO> =
  EntitySchemaWeaver.createWeaver<ValibotSchemaIO>(
    ValibotWeaver.useConfig(valibotWeaverConfig)
  )

// 自定义 GraphQL 类型到数据库列类型的映射
export const weaveEntitySchema2: CallableEntitySchemaWeaver<ValibotSchemaIO> =
  EntitySchemaWeaver.createWeaver<ValibotSchemaIO>(valibotSilk，{
    getProperty: (gqlType, field) => {
      const columnType = (() => {
        if (extensions.mikroProperty?.primary === true) return PostgresColumn.id
        if (gqlType instanceof GraphQLObjectType) return PostgresColumn.jsonb
        switch (gqlType) {
          case GraphQLString:
            return PostgresColumn.text
          case GraphQLInt:
            return PostgresColumn.integer
          case GraphQLFloat:
            return PostgresColumn.float
          case GraphQLBoolean:
            return PostgresColumn.bool
          case GraphQLJSON:
          case GraphQLJSONObject:
            return PostgresColumn.jsonb
          case GraphQLID:
            return PostgresColumn.id
        }
      })()
      return columnType ? { columnType } : undefined
    },
  })
```

### 定义 MikroORM 的 Entity Schema

在上面的代码中，我们创建的 `weaveEntitySchema` 函数可以将 `Valibot` 丝线编织成 MikroORM 的 Entity Schema。
现在我们将使用 `weaveEntitySchema` 函数来定义 Mikro Entity Schema。

```ts
import * as v from "valibot"
import { asField } from "@gqloom/valibot"
import { weaveEntitySchema } from "./weaveEntitySchema"

const Author = weaveEntitySchema(
  v.object({
    id: v.pipe(
      v.string(),
      asField({ extensions: { mikroProperty: { primary: true } } })
    ),
    name: v.string(),
  }),
  {
    name: "Author",
    indexes: [{ properties: ["name"] }],
  }
)
```

在上面的代码中，我们将 `Valibot` 的对象作为 `weaveEntitySchema` 的第一个参数，并在第二个参数中传入 EntitySchema 的配置。在此，我们定义了一个 `Author` 实体，其包含 `id` 和 `name` 两个属性，其中`id`为该实体的主键，此为，我们还为 `name` 属性添加了一个索引。

### 定义关系

在 MikroORM 中，[关系](https://mikro-orm.io/docs/relationships)是一种将多个实体连接起来的方式。在 GQLoom 中，我们可以使用 `weaveEntitySchema.withRelations` 来为实体定义关系。

```ts
import * as v from "valibot"
import { asField } from "@gqloom/valibot"
import { manyToOne } from "@gqloom/mikro-orm"
import { weaveEntitySchema } from "./weaveEntitySchema"

const Book = weaveEntitySchema.withRelations(
  v.object({
    ISBN: v.pipe(
      v.string(),
      asField({ extensions: { mikroProperty: { primary: true } } })
    ),
    sales: v.number(),
    title: v.string(),
  }),
  {
    author: manyToOne(() => Author, { nullable: true }),
  }
)
```

在上面的代码中，我们使用 `weaveEntitySchema.withRelations` 为 `Book` 实体定义了一个关于`author` 的多对一关系，该关系指向 `Author` 实体，并且该关系是可选的，你可以在 `manyToOne` 的第二个参数中定义更多关于该关系的配置。

## 解析器工厂

GQLoom 提供了直接从 MikroORM 的 Entity Schema 生成 GraphQL 操作的功能，这将极大简化开发过程。

首先，我们需要从 Entity Schema 创建解析器工厂。

```ts
import { EntitySchema } from "@mikro-orm/core"
import { MikroResolverFactory, mikroSilk } from "@gqloom/mikro-orm"

interface IGiraffe {
  id: string
  name: string
  birthday: Date
  height?: number | null
}

const Giraffe = mikroSilk(
  new EntitySchema<IGiraffe>({
    name: "Giraffe",
    properties: {
      id: { type: "number", primary: true },
      name: { type: "string" },
      birthday: { type: "Date" },
      height: { type: "number", nullable: true },
    },
  })
)

const giraffeResolverFactory = new MikroResolverFactory(Giraffe, () => orm.em)
```

在上面的代码中，我们首先定义了一个 `Giraffe` 实体，然后使用 `MikroResolverFactory` 创建了一个解析器工厂。从解析器工厂中，我们可以直接生成 GraphQL 操作。

```ts
const giraffeResolver = resolver.of(Giraffe, {
  giraffe: giraffeResolverFactory.FindOneQuery(),
  giraffes: giraffeResolverFactory.FindManyQuery(),
  createGiraffe: giraffeResolverFactory.CreateMutation(),
  updateGiraffe: giraffeResolverFactory.UpdateMutation(),
  deleteGiraffe: giraffeResolverFactory.DeleteOneMutation(),
})

const schema = weave(giraffeResolver)
```

只需要以上简单的代码，我们就可以从 `Giraffe` 实体生成 GraphQL 操作，并使用 `weave` 函数将它们编织到 GraphQL Schema 中。
得到的完整的 GraphQL Schema 如下：

```graphql
type Query {
  giraffe(id: ID!): Giraffe!
  giraffes(
    limit: Int
    orderBy: GiraffeFindManyOptionsOrderBy
    skip: Int
    where: GiraffeFindManyOptionsWhere
  ): [Giraffe!]!
}

type Mutation {
  createGiraffe(data: GiraffeCreateInput!): Giraffe!
  deleteGiraffe(id: ID!): Giraffe
  updateGiraffe(data: GiraffeUpdateInput!): Giraffe!
}

type Giraffe {
  birthday: String!
  height: Float
  id: ID!
  name: String!
}

input GiraffeCreateInput {
  birthday: String!
  height: Float
  id: ID
  name: String!
}

input GiraffeFindManyOptionsOrderBy {
  birthday: MikroQueryOrder
  height: MikroQueryOrder
  id: MikroQueryOrder
  name: MikroQueryOrder
}

input GiraffeFindManyOptionsWhere {
  birthday: StringMikroComparisonOperators
  height: FloatMikroComparisonOperators
  id: IDMikroComparisonOperators
  name: StringMikroComparisonOperators
}

input GiraffeUpdateInput {
  birthday: String
  height: Float
  id: ID!
  name: String
}

enum MikroQueryOrder {
  ASC
  ASC_NULLS_FIRST
  ASC_NULLS_LAST
  DESC
  DESC_NULLS_FIRST
  DESC_NULLS_LAST
}

input FloatMikroComparisonOperators {
  """
  <@
  """
  contained: [Float!]

  """
  @>
  """
  contains: [Float!]

  """
  Equals. Matches values that are equal to a specified value.
  """
  eq: Float

  """
  Greater. Matches values that are greater than a specified value.
  """
  gt: Float

  """
  Greater or Equal. Matches values that are greater than or equal to a specified value.
  """
  gte: Float

  """
  Contains, Contains, Matches any of the values specified in an array.
  """
  in: [Float!]

  """
  Lower, Matches values that are less than a specified value.
  """
  lt: Float

  """
  Lower or equal, Matches values that are less than or equal to a specified value.
  """
  lte: Float

  """
  Not equal. Matches all values that are not equal to a specified value.
  """
  ne: Float

  """
  Not contains. Matches none of the values specified in an array.
  """
  nin: [Float!]

  """
  &&
  """
  overlap: [Float!]
}

input IDMikroComparisonOperators {
  """
  <@
  """
  contained: [ID!]

  """
  @>
  """
  contains: [ID!]

  """
  Equals. Matches values that are equal to a specified value.
  """
  eq: ID

  """
  Greater. Matches values that are greater than a specified value.
  """
  gt: ID

  """
  Greater or Equal. Matches values that are greater than or equal to a specified value.
  """
  gte: ID

  """
  Contains, Contains, Matches any of the values specified in an array.
  """
  in: [ID!]

  """
  Lower, Matches values that are less than a specified value.
  """
  lt: ID

  """
  Lower or equal, Matches values that are less than or equal to a specified value.
  """
  lte: ID

  """
  Not equal. Matches all values that are not equal to a specified value.
  """
  ne: ID

  """
  Not contains. Matches none of the values specified in an array.
  """
  nin: [ID!]

  """
  &&
  """
  overlap: [ID!]
}

input StringMikroComparisonOperators {
  """
  <@
  """
  contained: [String!]

  """
  @>
  """
  contains: [String!]

  """
  Equals. Matches values that are equal to a specified value.
  """
  eq: String

  """
  Full text. A driver specific full text search function.
  """
  fulltext: String

  """
  Greater. Matches values that are greater than a specified value.
  """
  gt: String

  """
  Greater or Equal. Matches values that are greater than or equal to a specified value.
  """
  gte: String

  """
  ilike
  """
  ilike: String

  """
  Contains, Contains, Matches any of the values specified in an array.
  """
  in: [String!]

  """
  Like. Uses LIKE operator
  """
  like: String

  """
  Lower, Matches values that are less than a specified value.
  """
  lt: String

  """
  Lower or equal, Matches values that are less than or equal to a specified value.
  """
  lte: String

  """
  Not equal. Matches all values that are not equal to a specified value.
  """
  ne: String

  """
  Not contains. Matches none of the values specified in an array.
  """
  nin: [String!]

  """
  &&
  """
  overlap: [String!]

  """
  Regexp. Uses REGEXP operator
  """
  re: String
}
```