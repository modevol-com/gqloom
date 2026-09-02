# 从 TypeGraphQL 迁移到 GQLoom

## 为什么迁到 GQLoom

TypeGraphQL 使用类、装饰器与 `reflect-metadata`；GQLoom 直接将运行时 Schema（如 Zod、Valibot、Yup）或 ORM 模型（如 Prisma、Drizzle、MikroORM）编织为 GraphQL Schema。

- 一份 Schema 或 ORM 模型作为唯一事实源，替代原本分散的 GraphQL 类、TypeScript 类型与 `class-validator` 装饰器。TypeScript 类型由其自动推导，GraphQL 类型由其编织，输入校验即为 Schema 本身。
- 更少的样板代码，无需编写 `@ObjectType` 类、字段装饰器与平行的 TypeScript 类型层，校验直接内置于 Schema。
- 不再需要 `reflect-metadata`、`experimentalDecorators`、`emitDecoratorMetadata`、全局元数据仓库与内置 IoC 容器（如 TypeDI）。迁移完成后可以移除 `type-graphql`、`reflect-metadata` 与 `class-validator` 依赖，并关闭 `tsconfig.json` 中的装饰器编译器选项。
- 直接将 Prisma、Drizzle 与 MikroORM 模型作为丝线使用，通过解析器工厂生成标准 CRUD 操作，无需手写 DTO 类。
- `field().load()` 批量处理关联查询的 N+1 问题，无需编写自定义 DataLoader 类。
- 使用中间件与 `useContext()` 处理鉴权与请求数据，替代 `@Authorized` 装饰器与构造函数注入。订阅与 Apollo Federation 无需装饰器或代码生成即可支持。

## 概述与心智转变

| | TypeGraphQL | GQLoom |
| --- | --- | --- |
| 类型 | `@ObjectType` class | Zod / Valibot / ORM 模型（Silk） |
| 操作 | `@Resolver` class | `resolver({ ... })` 对象 |
| Schema | `buildSchema({ resolvers })` 扫描全局 metadata | `weave(ZodWeaver, ...resolvers)` 显式传入 |
| 校验 | 可选的 `class-validator` | Schema 本身，输入默认执行校验 |
| 鉴权 / DI | `@Authorized`、`container` | 中间件、`useContext()` |

建议与迁移策略：

- 默认推荐使用 Zod（`@gqloom/zod`）。若项目中已使用 Valibot，或数据层为 Prisma、Drizzle、MikroORM，可直接使用现有 Schema 或模型作为丝线，无需重复定义 DTO。
- 建议按模块渐进迁移。迁移期间保留 `type-graphql` 依赖，两个 `GraphQLSchema` 实例可共存并通过 [`mergeSchemas`](https://the-guild.dev/graphql/tools/docs/schema-merging) 合并，或在 HTTP 服务中分别挂载到不同路由。
- Query 与 Mutation 操作在 GQLoom 中依然保持独立定义，不应合并为单个 handler。

## 核心概念与映射表

下表列出两者概念与 API 存在差异的映射关系：

| TypeGraphQL | GQLoom | 注意 |
| --- | --- | --- |
| `@ObjectType` / `@Field` | `z.object()`，通过 `__typename` 或 `z.meta({ title })` 命名，通过 `z.describe()` 或 `z.meta({ description })` 添加描述 | 计算字段定义在 `resolver.of` 中，不写入 Silk |
| `@InputType` / `@ArgsType` | 独立的 input silk | 不要和 Object 共用同一份 Schema |
| `@Resolver` + `@Query` / `@Mutation` | `resolver` + `query` / `mutation` | |
| `@FieldResolver` + `@Root` | `resolver.of(Type, { field })` | parent 为 `resolve` 的第一个参数 |
| `@Arg` / `@Args` | `.input({ ... })` | 参数合并为一个对象 |
| `@Ctx` | [`useContext()`](../context.md) | 必须先注入 `asyncContextProvider` |
| `@Info` | `useResolverPayload().info` | |
| `@Authorized` + `authChecker` | [中间件](../middleware.md) | 操作使用 `.use()`，字段级鉴权使用 `field().use()` |
| `@UseMiddleware` | `.use()` 或 `weave(..., middleware)` | Koa 洋葱模型 |
| `container` / 构造注入 | context 或模块级 provider | 无内置 IoC 容器 |
| `class-validator` | Zod 规则 | 参见下方校验说明 |
| `emitSchemaFile` | `printSchema(lexicographicSortSchema(schema))` | 参见[打印 Schema](../advanced/printing-schema.md) |
| `registerEnumType` | `z.enum` + `asEnumType` | |
| `createUnionType` | `z.union` + `asUnionType` / `resolveType` | |
| `@InterfaceType` | `asObjectType({ interfaces })` | 参见下方多态查询与接口陷阱 |
| `@Directive` / `@Extensions` | `extensions`（联邦参见[Federation](../advanced/federation.md)） | |
| `complexity` | `extensions.complexity` | |
| `DataLoader` | [`field().load()`](../dataloader.md) | |
| `orphanedTypes` | 将未引用的 Silk 传给 `weave` | |

常用字段选项映射：

- `description`（丝线字段）→ `z.describe()` 或 `z.meta({ description })`（操作使用 `.description()`）
- `deprecationReason` → `.deprecationReason()`
- `nullable: true` → `.nullish()`（参见[关键陷阱与行为差异](#关键陷阱与行为差异)）
- `defaultValue` → Zod `.default(...)`

`asObjectType` 与 `asField` 是 Zod Schema 与 GraphQL Schema 之间的最后防线。通常用 `z.describe()` 或 `z.meta()` 声明元信息。仅在 Zod 元数据无法表达 GraphQL 特有配置时使用它们，例如接口（`asObjectType({ interfaces })`）、隐藏字段或覆盖字段 GraphQL 类型（`asField({ type })`）、复杂度或扩展等。

## 关键迁移实践

### 骨架

安装 `graphql`、`@gqloom/core`、`zod`、`@gqloom/zod` 以及所需的 HTTP 适配器。新编写的 GQLoom 代码无需开启 TypeScript 的 `experimentalDecorators`。

```ts twoslash
import { weave } from "@gqloom/core"
import { asyncContextProvider } from "@gqloom/core/context"
import { ZodWeaver } from "@gqloom/zod"
import { resolver, query } from "@gqloom/core"
import * as z from "zod"

const helloResolver = resolver({
  hello: query(z.string()).resolve(() => "Hello"),
})

export const schema = weave(
  ZodWeaver,
  asyncContextProvider, // [!code hl]
  helloResolver
)
```

若需要使 `Date` 类型与 TypeGraphQL 的 `DateTimeISO` 标量保持一致，可通过 `ZodWeaver.config` 配置 [`GraphQLDateTimeISO`](https://the-guild.dev/graphql/scalars)（SDL 标量名称为 `DateTimeISO`）：

```ts twoslash
import { ZodWeaver } from "@gqloom/zod"
import { GraphQLDateTimeISO } from "graphql-scalars"
import * as z from "zod"

export const zodWeaverConfig = ZodWeaver.config({
  presetGraphQLType: (schema) => {
    if (schema instanceof z.ZodDate) return GraphQLDateTimeISO
  },
})
```

将 `zodWeaverConfig` 传入 `weave` 即可。关于 HTTP 服务的挂载方式，请参阅[适配器](../advanced/adapters/)。

`ZodWeaver.config` 配合 `GraphQLDateTimeISO` 会将所有 `z.date()` 实例映射为 SDL 标量名称 `DateTimeISO`（ISO 字符串）。TypeGraphQL 的 `graphql-scalars` 示例使用 `Timestamp`（Unix 毫秒时间戳）。这两者是不同的标量，请选择与原有 SDL 一致的标量，不要盲目复制 `DateTimeISO` 配置。通过 `presetGraphQLType` 配置的 `z.date()` 仍然遵循 Zod 的可空性规则（`z.date()` 映射为 `DateTimeISO!`，`.nullish()` 映射为可空的 `DateTimeISO`）。

单个字段级别的 `graphql-scalars`（如 `NonEmptyString`、`NonNegativeInt`、`Timestamp` 等）通过 `asField({ type })` 作为最后防线进行配置（参见 [Zod](../schema/zod.md)）。与 `presetGraphQLType` 不同，`asField({ type: GraphQLTimestamp })` 会直接替换 GraphQL 类型，且不会保留非空修饰符 `!`：`z.date().register(asField, { type: GraphQLTimestamp })` 会编织为可空的 `Timestamp`。若要匹配非空的 `Timestamp!`，需使用从 `graphql` 导入的 `GraphQLNonNull` 进行包装（`type: new GraphQLNonNull(GraphQLTimestamp)`）。`GraphQLNonEmptyString` 等标量同理。

```ts
import { asField } from "@gqloom/zod"
import { GraphQLNonEmptyString, GraphQLTimestamp } from "graphql-scalars"
import { GraphQLNonNull } from "graphql"
import * as z from "zod"

const Recipe = z.object({
  title: z.string().register(asField, {
    type: new GraphQLNonNull(GraphQLNonEmptyString),
  }),
  creationDate: z.date().register(asField, {
    type: new GraphQLNonNull(GraphQLTimestamp),
  }),
})
```

### 类型与解析器

Object 类型通过 `__typename` 或 `z.meta({ title })` 命名；Input 类型需使用独立的 Silk 并通过 `z.meta({ title })` 命名。`asObjectType` 仅作为最后防线用于声明 GraphQL 特有配置。Query、Mutation 以及计算字段统一在 `resolver` 或 `resolver.of` 中定义，完整示例参见[参考实现与文档索引](#参考实现与文档索引)。

### 鉴权与上下文

```ts twoslash
import type { Middleware } from "@gqloom/core"
import { GraphQLError } from "graphql"
import { useContext } from "@gqloom/core/context"

interface Context {
  user?: { roles: string[] }
}

export function authGuard(...roles: string[]): Middleware {
  return async (next) => {
    const user = useContext<Context>().user
    if (user == null) throw new GraphQLError("Not authenticated")
    if (roles.length > 0 && !roles.some((role) => user.roles.includes(role))) {
      throw new GraphQLError("Not authorized")
    }
    return next()
  }
}
```

通过 `.use(authGuard("ADMIN"))` 可将中间件应用到单个操作，也可在 `weave` 中作为全局中间件传入。

TypeGraphQL 在类字段上声明的 `@Authorized()` 或 `@Authorized("ADMIN")` 与 Query/Mutation 操作上的鉴权不同。在 Object Silk 上保留该属性以确保 GraphQL SDL 包含该字段（例如 `ratings` 或 `ingredients`）。在 `resolver.of` 中使用 `field().use(authGuard())` 或 `field().use(authGuard("ADMIN"))` 为该字段添加鉴权保护。仅在 Silk 中声明的字段不会执行中间件。操作级别依然使用前述 `.use(authGuard())`。

```ts
import { field, resolver } from "@gqloom/core"
import * as z from "zod"

const Recipe = z.object({ ratings: z.array(z.int()) }).meta({ title: "Recipe" })

export const recipeResolver = resolver.of(Recipe, {
  ratings: field(z.array(z.int()))
    .use(authGuard("ADMIN"))
    .resolve((recipe) => recipe.ratings),
})
```

TypeGraphQL 中通过构造函数注入的 Service，在 GQLoom 中应改由上下文（Context）或模块级 Provider 提供。除非 Service 是纯无状态的，否则不要在 `resolve` 函数内直接 `new Service()`。

### ORM

如果已在项目中集成 Prisma、Drizzle 或 MikroORM，可直接将数据模型作为 Silk 传入，并通过解析器工厂生成基础 CRUD 操作，无需将 `@Entity` 与 `@ObjectType` 手动转换为 Zod Schema。详情请参阅 [Prisma](../schema/prisma.md#解析器工厂)、[Drizzle](../schema/drizzle.md#解析器工厂) 与 [MikroORM](../schema/mikro-orm.md#解析器工厂)。

针对关联字段的 N+1 查询问题，使用 [`field().load()`](../dataloader.md) 即可，无需单独手写 DataLoader 类。

## 关键陷阱与行为差异

- Object 与 Input 类型的区分：GraphQL 规范要求 Output 与 Input 类型必须分离。TypeGraphQL 分别使用 `@ObjectType` 与 `@InputType` 类；在 GQLoom 中需分别为其定义独立的 Silk，不能共用同一个 Object Silk 作为输入类型。

- 空值处理（Nullability）与 `.optional()`：在 Zod 中，`.optional()` 仅表示输入对象中该属性可以缺失（`undefined`），并不会将其在 GraphQL 中声明为可空（`null`）。若要对应 TypeGraphQL 的 `nullable: true`（生成可空的 `String`），应使用 `.nullish()` 或 `.nullable()`：

| TypeGraphQL | GraphQL | Zod |
| --- | --- | --- |
| `@Field() title: string` | `String!` | `z.string()` |
| `@Field({ nullable: true }) description?: string` | `String` | `z.string().nullish()` |

- 输入校验与错误格式：TypeGraphQL 支持通过 `validate: false` 关闭校验，而 GQLoom 没有 `validate: false` 选项，默认在进入 `resolve` 函数前通过 Schema 校验输入。如果不符合规则，请求会在执行前抛出错误。若此前依赖在解析函数内部手动校验或接收未校验数据，需要调整 Schema 定义。此外，错误结构也有所不同：`class-validator` 抛出 `ArgumentValidationError`（`extensions.validationErrors`），而 GQLoom 返回标准 Schema Issue（Zod 中对应 `extensions.issues`）。若客户端解析了 `extensions.validationErrors`，需同步调整客户端逻辑。完整校验规则参见 [Zod](../schema/zod.md)。

| class-validator | Zod |
| --- | --- |
| `@MaxLength(n)` | `z.string().max(n)` |
| `@MinLength(n)` | `z.string().min(n)` |
| `@Length(min, max)` | `z.string().min(min).max(max)` |
| `@Min(n)` / `@Max(n)`（针对 int） | `z.int().min(n)` / `z.int().max(n)` |

迁移带有约束的可空字段（如 `@Field({ nullable: true })` 与 `@Length(30, 255)`）时，使用 `z.string().min(30).max(255).nullish()` 并将 `.nullish()` 放在最外层，而不是 `.optional()`。

- `useContext()` 依赖 `asyncContextProvider`：调用 `useContext()` 前必须在 `weave` 中注入 `asyncContextProvider` 中间件，否则无法获取上下文对象。在不支持 `AsyncLocalStorage` 的运行环境（如部分 Edge Runtime 或浏览器）中，应改用 [`useResolverPayload().context`](../context.md#直接访问解析器负载)。

- `Date` 类型与 `DateTimeISO` 标量：`z.date()` 默认会被编织为 GraphQL `String`。若要与 TypeGraphQL 对齐生成 `DateTimeISO` 标量，必须显式通过 `ZodWeaver.config` 配置类型映射。

- 参数默认值与 SDL 表现：在输入字段上调用 `.default(...)` 会在运行时解析时填充默认值，但生成的 GraphQL SDL 中该参数仍可能声明为可空类型，而不是 `Int! = 0`。

- 接口与多态查询（Interfaces）：当实现类型仅通过 `asObjectType({ interfaces: [IPerson] })` 声明接口时，GQLoom 会正确编织出 `interface IPerson` 与 `type Student implements IPerson`。但如果直接在查询中声明 `query(z.array(IPerson))`，GQLoom 会将 `IPerson` 编织为普通 Object 类型。若在同一个 weave 中同时存在 `query(z.array(IPerson))` 与带有 `interfaces: [IPerson]` 的实现类型，GraphQL 会抛出错误：`Schema must contain uniquely named types but contains multiple types named "IPerson"`。为了安全地返回多态列表，推荐在查询端使用可辨识联合（Discriminated Union）：`z.discriminatedUnion("__typename", [Student, Employee])`（或 `z.union` 配合 `asUnionType` / `resolveType`），避免在同一个 weave 中直接 `query(z.array(IPerson))`。生成的 SDL 将展示为 `union Persons = Employee | Student`，客户端依然通过 `__typename` 与内联片段（Inline Fragments）进行查询。此外，普通的 `z.string()` 会被编织为 `String!`；若要输出 GraphQL `ID!` 标量，需使用 `z.string().uuid()`、`cuid()` 或 `ulid()`（参见 [Zod](../schema/zod.md)）。

```ts
import { query, resolver } from "@gqloom/core"
import { asObjectType } from "@gqloom/zod"
import * as z from "zod"

const IPerson = z.object({
  __typename: z.literal("IPerson").nullish(),
  id: z.string(),
  name: z.string(),
})

const Student = z
  .object({
    __typename: z.literal("Student"),
    id: z.string(),
    name: z.string(),
    universityName: z.string(),
  })
  .register(asObjectType, { interfaces: [IPerson] })

const Employee = z
  .object({
    __typename: z.literal("Employee"),
    id: z.string(),
    name: z.string(),
    companyName: z.string(),
  })
  .register(asObjectType, { interfaces: [IPerson] })

const Persons = z.discriminatedUnion("__typename", [Student, Employee])

export const personResolver = resolver({
  persons: query(z.array(Persons)).resolve(() => []),
})
```

## 边界与停机条件

如果项目中使用了以下模式，建议先评估架构方案，避免强行机械迁移：

- NestJS 集成：若使用 NestJS + TypeGraphQL 或 `@nestjs/graphql` 的 Code-First 模式，由于其深度依赖 NestJS 的装饰器与 IoC 容器，需要作为独立模块重新设计。
- 请求作用域 IoC（Request-scoped Container）：TypeGraphQL 的 `using-scoped-container` 或按请求 `container.get` 机制在 GQLoom 中没有对应的容器生命周期管理，应改用请求级 Context。
- 泛型 Resolver、复杂类继承与 Mixin：GQLoom 采用纯函数与对象组合方式，此类继承结构通常需展平为独立的 `resolver` 对象或通过工厂函数生成。
- 自定义参数装饰器（`createParameterDecorator`）：应改用 `useContext()` 或 `.input()` 实现相应逻辑。

TypeGraphQL 的 `simpleResolvers` 配置通常无需特殊处理。关于 Federation、订阅与自定义标量，请参阅[联邦](../advanced/federation.md)、[订阅](../advanced/subscription.md)与 [Zod 自定义类型映射](../schema/zod.md#自定义类型映射)。

## 验证与验收标准

迁移的核心目标是保证 GraphQL Schema 契约与接口行为的一致性：

1. 使用 TypeGraphQL 的 `emitSchemaFile` 或 `printSchema` 导出迁移前的完整 GraphQL SDL。
2. 使用 GQLoom 以相同方式导出 Schema SDL：

```ts twoslash
import { weave } from "@gqloom/core"
import { query, resolver } from "@gqloom/core"
import { ZodWeaver } from "@gqloom/zod"
import { lexicographicSortSchema, printSchema } from "graphql"
import * as z from "zod"

const helloResolver = resolver({
  hello: query(z.string()).resolve(() => "Hello"),
})

const schema = weave(ZodWeaver, helloResolver)
export const sdl = printSchema(lexicographicSortSchema(schema))
```

3. 比对两份 SDL 中的类型名称、字段列表、参数定义、可空性（Nullability）与枚举值。
4. 重放原有的 Query、Mutation 与 Subscription 测试用例，核对返回的 `data` 数据。针对输入校验失败与鉴权异常，按照 GQLoom 的错误结构与 `extensions`（参见[关键陷阱与行为差异](#关键陷阱与行为差异)）进行验收。

当所有模块迁移完成且 SDL 与接口测试均通过后，可移除 `type-graphql`、`reflect-metadata` 与 `class-validator` 依赖，并从 `tsconfig.json` 中移除 `experimentalDecorators` 与 `emitDecoratorMetadata` 配置。

## 参考实现与文档索引

以下示例展示将 TypeGraphQL 官方 `simple-usage` 中的 Recipe 示例迁移至 GQLoom 的完整实现。计算字段（`specification`、`averageRating`、`ratingsCount`）定义在 `resolver.of` 中，不包含在基础 Object Silk 内。

::: code-group

```ts twoslash [GQLoom]
import {
  field,
  mutation,
  query,
  resolver,
  weave,
} from "@gqloom/core"
import { ZodWeaver } from "@gqloom/zod"
import { GraphQLDateTimeISO } from "graphql-scalars"
import * as z from "zod"

const zodWeaverConfig = ZodWeaver.config({
  presetGraphQLType: (schema) => {
    if (schema instanceof z.ZodDate) return GraphQLDateTimeISO
  },
})

const Recipe = z
  .object({
    title: z.string(),
    description: z
      .string()
      .nullish()
      .describe("The recipe description with preparation info"),
    ratings: z.array(z.int()),
    creationDate: z.date(),
  })
  .meta({
    title: "Recipe",
    description: "Object representing cooking recipe",
  })

type IRecipe = z.infer<typeof Recipe>

const RecipeInput = z
  .object({
    title: z.string(),
    description: z.string().nullish(),
  })
  .meta({ title: "RecipeInput" })

const items: IRecipe[] = [
  {
    title: "Recipe 1",
    description: "Desc 1",
    ratings: [0, 3, 1],
    creationDate: new Date("2018-04-11"),
  },
]

export const recipeResolver = resolver.of(Recipe, {
  recipe: query(Recipe.nullish())
    .input({ title: z.string() })
    .resolve(({ title }) => items.find((recipe) => recipe.title === title)),

  recipes: query(z.array(Recipe))
    .description("Get all the recipes from around the world")
    .resolve(() => items),

  addRecipe: mutation(Recipe)
    .input({ recipe: RecipeInput })
    .resolve(({ recipe }) => {
      const created: IRecipe = {
        ...recipe,
        ratings: [],
        creationDate: new Date(),
      }
      items.push(created)
      return created
    }),

  specification: field(z.string().nullish())
    .deprecationReason("Use 'description' field instead")
    .resolve((recipe) => recipe.description),

  averageRating: field(z.number().nullish()).resolve((recipe) => {
    if (recipe.ratings.length === 0) return null
    return recipe.ratings.reduce((a, b) => a + b, 0) / recipe.ratings.length
  }),

  ratingsCount: field(z.int())
    .input({ minRate: z.int().default(0) })
    .resolve((recipe, { minRate }) => {
      return recipe.ratings.filter((rating) => rating >= minRate).length
    }),
})

export const schema = weave(ZodWeaver, zodWeaverConfig, recipeResolver)
```

```ts [TypeGraphQL]
@ObjectType({ description: "Object representing cooking recipe" })
class Recipe {
  @Field()
  title!: string

  @Field({ nullable: true, description: "The recipe description with preparation info" })
  description?: string

  @Field((type) => [Int])
  ratings!: number[]

  @Field()
  creationDate!: Date

  @Field((type) => String, {
    nullable: true,
    deprecationReason: "Use 'description' field instead",
  })
  get specification(): string | undefined {
    return this.description
  }

  @Field((type) => Float, { nullable: true })
  get averageRating(): number | null { /* ... */ }
}

@Resolver((of) => Recipe)
class RecipeResolver {
  @Query((returns) => Recipe, { nullable: true })
  recipe(@Arg("title") title: string) { /* ... */ }

  @Query((returns) => [Recipe], {
    description: "Get all the recipes from around the world",
  })
  recipes() { /* ... */ }

  @Mutation((returns) => Recipe)
  addRecipe(@Arg("recipe") recipeInput: RecipeInput) { /* ... */ }

  @FieldResolver()
  ratingsCount(
    @Root() recipe: Recipe,
    @Arg("minRate", (type) => Int, { defaultValue: 0 }) minRate: number,
  ) { /* ... */ }
}
```

:::

与 TypeGraphQL 官方生成的 SDL 相比，`ratingsCount` 操作中的 `minRate` 参数在此处会被编织为可空参数：`.default(0)` 在运行时解析输入时提供默认值，但在 SDL 中不会输出为 `Int! = 0`。其余字段集合、核心类型可空性以及 `DateTimeISO` 标量均与原 Schema 一致。

相关文档：

- [Zod](../schema/zod.md): `z.describe()`、`z.meta()`、枚举、联合、接口，以及作为最后防线的 `asObjectType` / `asField`
- [解析器](../resolver.md): `resolver.of`、`query`、`mutation` 与 `field`
- [中间件](../middleware.md): 鉴权、日志与输出校验
- [上下文](../context.md): `useContext` 与 `asyncContextProvider`
- [数据加载器](../dataloader.md): `field().load()`
