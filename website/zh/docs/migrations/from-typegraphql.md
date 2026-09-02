# 从 TypeGraphQL 迁移到 GQLoom

TypeGraphQL 用 class 和装饰器描述 GraphQL Schema。GQLoom 用你已经在用的运行时 Schema（默认 [Zod](https://zod.dev/)）直接编织出 Schema。两边都是 Code-First，但骨架不同：没有 `reflect-metadata`，没有全局元数据仓库，也没有内置 IoC。

这篇指南只写**迁的时候容易猜错的地方**。GQLoom 的 API 细节见 [丝线](../silk.md)、[解析器](../resolver.md)、[编织](../weave.md)、[上下文](../context.md)、[中间件](../middleware.md)。

## 概述与心智转变

| | TypeGraphQL | GQLoom |
| --- | --- | --- |
| 类型 | `@ObjectType` class | Zod / Valibot / ORM 模型（Silk） |
| 操作 | `@Resolver` class | `resolver({ ... })` 对象 |
| Schema | `buildSchema({ resolvers })` 扫描全局 metadata | `weave(ZodWeaver, ...resolvers)` 显式传入 |
| 校验 | 可选的 `class-validator` | Schema 本身，输入默认就会校验 |
| 鉴权 / DI | `@Authorized`、`container` | 中间件、`useContext()` |

**默认选择：**

- Schema 库用 **Zod**（`@gqloom/zod`）。项目里已经是 Valibot，或主体是 Prisma / Drizzle / Mikro，就织现有类型，不要再抄一层 DTO。
- 按模块渐进迁移，先不要卸载 `type-graphql`。两个 `GraphQLSchema` 可以并存，再用 [`mergeSchemas`](https://the-guild.dev/graphql/tools/docs/schema-merging) 合成，或暂时挂两条 HTTP 路径。

Query 和 Mutation 在 GQLoom 里仍然分开，不要收成一个 handler。

## 核心概念与映射表

只列出**不能按名字直译**的部分：

| TypeGraphQL | GQLoom | 注意 |
| --- | --- | --- |
| `@ObjectType` / `@Field` | `z.object()`，必要时 `asObjectType` / `asField` | 计算字段放到 `resolver.of`，不要写进 silk |
| `@InputType` / `@ArgsType` | 独立的 input silk | 不要和 Object 共用同一份 Schema |
| `@Resolver` + `@Query` / `@Mutation` | `resolver` + `query` / `mutation` | |
| `@FieldResolver` + `@Root` | `resolver.of(Type, { field })` | parent 是 `resolve` 的第一个参数 |
| `@Arg` / `@Args` | `.input({ ... })` | 参数变成一个对象 |
| `@Ctx` | [`useContext()`](../context.md) | 必须先挂 `asyncContextProvider` |
| `@Info` | `useResolverPayload().info` | |
| `@Authorized` + `authChecker` | [中间件](../middleware.md) | 没有内置 role checker |
| `@UseMiddleware` | `.use()` 或 `weave(..., middleware)` | Koa 洋葱模型 |
| `container` / 构造注入 | context 或模块级 provider | **没有 TypeDI** |
| `class-validator` | Zod 规则 | 见下方校验 |
| `emitSchemaFile` | `printSchema(lexicographicSortSchema(schema))` | 见 [打印 Schema](../advanced/printing-schema.md) |
| `registerEnumType` | `z.enum` + `asEnumType` | |
| `createUnionType` | `z.union` + `asUnionType` / `resolveType` | |
| `@InterfaceType` | `asObjectType({ interfaces })` | |
| `@Directive` / `@Extensions` | `extensions`（联邦见 [Federation](../advanced/federation.md)） | |
| `complexity` | `extensions.complexity` | |
| `DataLoader` | [`field().load()`](../dataloader.md) | |
| `orphanedTypes` | 把未引用的 silk 传给 `weave` | |

常用字段选项：

- `description` → `.description()` 或 `asField` / Zod `.meta({ description })`
- `deprecationReason` → `.deprecationReason()`
- `nullable: true` → `.nullish()`（见[陷阱](#关键陷阱与行为差异)）
- `defaultValue` → Zod `.default(...)`

## 关键迁移实践

### 骨架

安装 `graphql`、`@gqloom/core`、`zod`、`@gqloom/zod`，以及你现有的 Yoga / Apollo 适配器。新文件不必再开 `experimentalDecorators`。

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

需要 `Date` 与 TypeGraphQL 的 `DateTimeISO` 对齐时，用 `ZodWeaver.config` 映射 [`GraphQLDateTimeISO`](https://the-guild.dev/graphql/scalars)（SDL 名就是 `DateTimeISO`）：

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

把 `zodWeaverConfig` 一并传给 `weave`。HTTP 层见 [适配器](../advanced/adapters/)。

### 类型与解析器

Object 用 `__typename` 或 `asObjectType` 命名；Input 用另一份 silk 并显式命名。Query / Mutation / 计算字段写在 `resolver` / `resolver.of` 里，完整对照见[参考实现](#参考实现与文档索引)。

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

挂到单个操作上用 `.use(authGuard("ADMIN"))`，或作为 `weave` 的全局中间件。

原先构造函数注入的 service，改放到 context 或模块顶层的 provider。不要在 `resolve` 里随意 `new Service()`，除非它本来就是无状态的。

### ORM

已经在用 Prisma、Drizzle 或 Mikro 时，把实体直接当 silk，CRUD 交给解析器工厂，而不是再把 `@Entity` + `@ObjectType` 译成 Zod。见 [Prisma](../schema/prisma.md#解析器工厂)、[Drizzle](../schema/drizzle.md#解析器工厂)、[MikroORM](../schema/mikro-orm.md#解析器工厂)。

关联字段上的 N+1 用 [`field().load()`](../dataloader.md)，不必手写 DataLoader 类。

## 关键陷阱与行为差异

**Object 和 Input 必须分开。** GraphQL 不允许同一个类型既当 output 又当 input。TypeGraphQL 用 `@ObjectType` / `@InputType` 两套 class；GQLoom 就准备两份 silk。

**Nullability 不要用 `.optional()` 去对 `nullable: true`。**

| TypeGraphQL | GraphQL | Zod |
| --- | --- | --- |
| `@Field() title: string` | `String!` | `z.string()` |
| `@Field({ nullable: true }) description?: string` | `String` | `z.string().nullish()` |

`.optional()` 只表示「属性可以缺」，不表示 GraphQL 的 `null`。要对齐 `nullable: true`，用 `.nullish()` 或 `.nullable()`。

**GQLoom 会校验输入。** TypeGraphQL 可以 `validate: false`。迁过来之后，不符合 Zod 的参数会在进 `resolve` 之前失败。若你依赖「先拿脏数据再自己处理」，需要改 Schema 或接受新行为。

校验错误形状也不同：`class-validator` 走 `ArgumentValidationError`；GQLoom 走 Schema issue。客户端如果解析了旧的 `extensions.validationErrors`，要一起改。

**`useContext()` 依赖 `asyncContextProvider`。** 没挂上时拿不到上下文。不支持 `AsyncLocalStorage` 的环境（部分 Edge / 浏览器）改用 [`useResolverPayload().context`](../context.md#直接访问解析器负载)。

**默认不要把 Date 当成 `DateTimeISO`。** `z.date()` 默认织成 `String`。要和 TypeGraphQL 2 对齐，显式映射标量。

**参数上的 `.default()` 不一定变成 GraphQL `= 0`。** 解析时会补默认值，SDL 里该参数仍可能是可空的。

## 边界与停机条件

遇到这些情况，不要硬编等价物，先停下来看架构：

- **NestJS + TypeGraphQL**，或 `@nestjs/graphql` 的 code-first。那是另一套装饰器 / DI 运行时。
- **Request-scoped IoC**（`using-scoped-container`、按请求 `container.get`）。GQLoom 没有容器生命周期。
- **泛型 Resolver、深层 class 继承、mixin**。通常展平成普通 `resolver` 对象；展不平就人工处理。
- **自定义参数装饰器**（`createParameterDecorator`）。改成 `useContext` 或 `.input()`；语义不清就停。

`simpleResolvers` 一般可以忽略。Federation、订阅、自定义标量分别看 [联邦](../advanced/federation.md)、[订阅](../advanced/subscription.md)、[Zod 自定义映射](../schema/zod.md#自定义类型映射)。

## 验证与验收标准

迁的不是 class，是契约。

1. 用 TypeGraphQL 的 `emitSchemaFile`（或一次 `printSchema`）冻一份 SDL。
2. GQLoom 用同样方式导出：

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

3. 对比类型名、字段、参数、nullability、enum 值。描述和弃用信息按你是否要保持文档一致来决定。
4. 把原来的查询 / 变更 / 订阅重放一遍，核对 `data`。校验失败和未授权的错误码、`extensions` 按[上文声明的新形状](#关键陷阱与行为差异)验收，而不是假装和 TypeGraphQL 完全一样。

全部模块迁完、SDL 与请求都稳定之后，再卸载 `type-graphql`、`reflect-metadata`、`class-validator`，并去掉 `experimentalDecorators` / `emitDecoratorMetadata`。

## 参考实现与文档索引

下面把 TypeGraphQL 官方 `simple-usage` 的 Recipe 迁成 GQLoom。计算字段（`specification`、`averageRating`、`ratingsCount`）放在 `resolver.of` 里，不放进 silk。

::: code-group

```ts twoslash [GQLoom]
import {
  field,
  mutation,
  query,
  resolver,
  weave,
} from "@gqloom/core"
import { asField, asObjectType, ZodWeaver } from "@gqloom/zod"
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
    description: z.string().nullish().register(asField, {
      description: "The recipe description with preparation info",
    }),
    ratings: z.array(z.int()),
    creationDate: z.date(),
  })
  .register(asObjectType, {
    name: "Recipe",
    description: "Object representing cooking recipe",
  })

type IRecipe = z.infer<typeof Recipe>

const RecipeInput = z
  .object({
    title: z.string(),
    description: z.string().nullish(),
  })
  .register(asObjectType, { name: "RecipeInput" })

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

和 TypeGraphQL 官方 SDL 相比，`ratingsCount` 的 `minRate` 在这里会织成可空参数：`.default(0)` 在解析时补默认值，不一定变成 GraphQL 里的 `Int! = 0`。字段集合、nullability 主体和 `DateTimeISO` 标量是对齐的。

继续阅读：

- [Zod](../schema/zod.md) — 枚举、联合、接口、`asField`
- [解析器](../resolver.md) — `resolver.of`、`query` / `mutation` / `field`
- [中间件](../middleware.md) — 鉴权、日志、输出校验
- [上下文](../context.md) — `useContext`、`asyncContextProvider`
- [数据加载器](../dataloader.md) — `field().load()`
