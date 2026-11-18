# 从 Pothos 迁移到 GQLoom

## 为什么迁到 GQLoom

Pothos 与 GQLoom 都坚持无装饰器、纯运行时的原生 TypeScript 路线，但两者的出发点截然不同。

Pothos 秉持**以 GraphQL 为中心的构建器（Builder）理念**。它把内部业务数据与对外 GraphQL 契约看作两套独立的体系，所有类型与字段都围绕一个共享的构建器展开，写进回调函数里，再通过插件往构建器上叠加各种能力。

GQLoom 则秉持**以运行时类型为中心的编织（Weaving）理念**。应用里已有的校验 Schema 和 ORM 模型本来就描述了最真实的数据结构，GraphQL Schema 应当直接从中「编织」而出，同时把数据、逻辑和组装彻底分开。

- **单一事实源，告别多层同步**

  Pothos 把内部模型、GraphQL 声明与输入校验拆成彼此分离的层，常常需要来回对齐。GQLoom 直接复用现有的校验 Schema 或 ORM 模型作为图类型——一份定义同时管住 TypeScript 类型、输入校验与对外契约，领域模型也不与 GraphQL 绑定。

- **独立模块，摆脱中心化 Builder 的束缚**

  Pothos 的 Builder 模式要求所有模块依附于同一个共享构建器，字段也被锁在回调里，模块组织依赖导入时的隐式注册，既不便自由拆分组合，也难以脱离 GraphQL 单独运行。GQLoom 没有共享构建器：每个业务模块都是独立自洽的普通对象，只在入口处显式编织成图，同一套业务逻辑还能直接复用到单元测试或非 GraphQL 入口。

- **统一简洁的机制，代替插件拼装**

  Pothos 把核心收得很小，却把校验、鉴权、批处理、ORM 接入等高频需求分散到各自插件中，带来额外的选型、配置与协同成本。GQLoom 直接对接现有的校验库与 ORM 生态，并把这些常见能力收口为少数一致的内置机制，少一层胶水，心智负担也更轻。

如果你有意把对外接口与内部模型严格隔开，或重度依赖 Pothos 的插件生态，Pothos 依然顺手；但当你希望用一套模型贯通类型、校验与接口，并让模块保持纯粹独立时，GQLoom 在设计上会更加轻快自然。

## 概述与心智转变

| | Pothos | GQLoom |
| --- | --- | --- |
| 类型 | `objectRef` + `implement`、`t.expose*` | Zod / Valibot / ORM 模型（Silk） |
| 操作 | `builder.queryType` / `mutationType` / `subscriptionType` | `resolver({ ... })` 与 `resolver.of(Silk, { ... })` |
| Schema | `builder.toSchema()` | `weave(ZodWeaver, ...resolvers)` 显式传入 |
| 校验 | 可选的 `@pothos/plugin-zod` / `@pothos/plugin-validation` | Schema 本身，输入默认执行校验 |
| 鉴权 / 上下文 | `authScopes`、`context` 参数 | 中间件、`useContext()` |

迁移建议：

- 默认推荐使用 Zod（`@gqloom/zod`）。若项目中已使用 Valibot，或数据层为 Prisma、Drizzle、MikroORM，可直接编织现有 Schema 或模型，无需再维护一份平行的 Pothos 声明。
- 按模块渐进迁移。迁移期间保留 `@pothos/core`，两个 `GraphQLSchema` 实例可以共存并通过 [`mergeSchemas`](https://the-guild.dev/graphql/tools/docs/schema-merging) 合并，或在 HTTP 服务中分别挂载到不同路由。
- 对象 Silk 仅保留数据属性，计算字段与关联字段定义在 `resolver.of(Silk, { ... })` 中。可空性以打印出的 Pothos SDL 为准（可空输出和可选输入统一写 `.nullish()`），不要凭记忆猜。

## 核心概念与映射表

下表列出两者概念与 API 存在差异的映射关系：

| Pothos | GQLoom | 注意 |
| --- | --- | --- |
| `SchemaBuilder` + `builder.toSchema()` | `weave(ZodWeaver, config, ...resolvers)` | 调用 `useContext()` 时传入 `asyncContextProvider`；不可达的 Silk 不会出现在 SDL 中 |
| `builder.objectType` / `objectRef` + `implement` | `z.object({ ... }).meta({ title })` | 计算字段与关联字段定义在 `resolver.of` 中，不写入 Silk |
| `t.exposeString` / `Int` / `Float` / `Boolean` | `z.object` 的属性 | 对象属性默认全部暴露；私有属性用 `field.hidden` 隐藏 |
| `t.exposeID` / `t.arg.id` | `asField({ type: GraphQLID })`（`NullableID`）/ `new GraphQLNonNull(GraphQLID)`（`ID`） | `z.string()` 输出 `String`，按 SDL 选择（规则 8） |
| `t.string` / `t.field({ resolve })` | `resolver.of(Silk, { name: field(type).resolve((parent) => ...) })` | `parent` 为 `resolve` 的第一个参数 |
| `builder.objectFields(Ref, fields)` | 另一个 `resolver.of(Silk, { ... })` | 可在不同模块扩展同一类型 |
| `builder.inputType` / `builder.inputRef` | 独立的 `z.object({ ... }).meta({ title })` | 不要和 Object 共用同一个 Silk |
| `builder.queryType` / `mutationType` / `subscriptionType` / `*Field` | `resolver({ ... })` 中的 `query`、`mutation`、`subscription` | Subscription 使用 `.subscribe(async function* ...)` |
| `t.arg.*` / `args` | `.input({ ... })` | 参数合并为一个对象 |
| `builder.enumType` | `z.enum([...]).meta({ title })` | |
| `builder.unionType` + `resolveType` | `z.discriminatedUnion("__typename", [...]).meta({ title })` | 或 `z.union` 配合 `asUnionType` / `resolveType` |
| `builder.interfaceType` + `interfaces: [I]` | `asObjectType({ interfaces: [I] })` | 禁止直接返回接口 Silk（见[陷阱](#陷阱)） |
| `builder.scalarType` / `addScalarType` | `ZodWeaver.config({ presetGraphQLType })` 或 `asField({ type })` | `Date`（`z.ZodDate`）在 `presetGraphQLType` 中全局映射 |
| `context` 参数 | [`useContext<Ctx>()`](../context.md) | 必须传入 `asyncContextProvider` |
| `info` 参数 | `useResolverPayload().info` | |
| `@pothos/plugin-scope-auth`（`authScopes`） | 使用 `.use()` 的[中间件](../middleware.md) | 操作使用 `.use()`，对象字段使用 `field().use()` |
| `@pothos/plugin-dataloader`（`loadableObject`、`t.loadable`） | [`field().load()`](../dataloader.md) | 测试中需传入 `contextValue: {}` |
| `@pothos/plugin-zod` / `@pothos/plugin-validation` | Zod Schema 规则 | 进入 `resolve` 前自动校验输入 |
| `@pothos/plugin-complexity` | `extensions: { complexity }` | 仓库示例：`examples/query-complexity` |
| `@pothos/plugin-federation` | [Federation](../advanced/federation.md) | |
| `@pothos/plugin-simple-objects`（`builder.simpleObject`） | `z.object` | |
| `@pothos/plugin-with-input`（`t.fieldWithInput`） | `.input({ input: NamedInputSilk })` | 显式命名输入 Silk |
| `@pothos/plugin-prisma` / `@pothos/plugin-drizzle` | 解析器工厂与 `relationField` | 见 [Prisma 与 Drizzle 插件](#prisma-与-drizzle-插件) |
| `@pothos/plugin-relay`、`-errors`、`-sub-graph`、`-smart-subscriptions` | 停止，该模块保留 Pothos | 见[何时迁移与何时停止](#何时迁移与何时停止) |

常用字段选项映射：

- `description` → Silk 属性上使用 `z.describe()` 或 `z.meta({ description })`（操作与字段使用 `.description()`）
- `deprecationReason` → `.deprecationReason()`
- `nullable: true` / 可选参数 → `.nullish()`（`nullable: { list: true, items: true }` 对应 `z.array(X.nullish()).nullish()`）
- 参数与输入上的 `required: true` → 不带修饰的 Zod 类型（省略 `.nullish()`）

普通名称与描述使用 `z.describe()` 或 `z.meta()` 声明，全局标量（如 `Date`）通过 `ZodWeaver.config({ presetGraphQLType })` 注册一次并传入 `weave`。仅在 Zod 元数据无法表达 GraphQL 特有配置时使用 `asObjectType` 与 `asField`，例如接口（`asObjectType({ interfaces })`）、`ID` 标量（`asField({ type })`）或 `extensions`。

## 规则

只读这一页的模型也必须遵守下列规则。每条规则在后文都有对应代码。

1. 必须在改动代码前保存 Pothos 的 SDL：把 `printSchema(lexicographicSortSchema(builder.toSchema()))` 写入 `before.graphql`。只有当 GQLoom 的 SDL `diff` 为空，且重放的请求返回相同 JSON 时，迁移才算完成。
2. 必须从打印出的 SDL 抄可空性，不要凭记忆。Pothos 4 在 builder 未设置 `defaultFieldNullability: false` 时输出可空字段、可选参数；Pothos 3 输出非空字段。每个可空输出与每个可选输入都写成 `.nullish()`（统一写法；`.nullable()` 会让 TypeScript 拒绝返回 `undefined` 的解析函数），其余使用不带修饰的 Zod 类型。
3. 必须把每个 Pothos 对象类型改写为一个 `z.object({ ... }).meta({ title: "Name" })`。不要照搬 `objectRef`、`implement`、`builder`。
4. 必须用 `resolver.of(Silk, { name: field(type).resolve((parent) => ...) })` 定义每个计算字段或关联字段。parent 是 `resolve` 的第一个参数；没有 `t` 回调，也没有 `ctx` 参数。
5. 必须用 `resolver({ name: query(...) | mutation(...) | subscription(...) })` 定义每个根字段。参数只能通过 `.input({ ... })` 传入。
6. 必须用 `resolver.of` 中的 `name: field.hidden` 隐藏 Pothos 没有用 `t.expose*` 暴露的每个属性。Zod 对象会暴露全部属性。
7. 必须把输入对象声明为独立的 Silk，并各自使用 `.meta({ title })`。禁止把对象 Silk 当作输入。
8. 必须一次性定义两个 ID 辅助常量：`NullableID`（`asField({ type: GraphQLID })`，输出 `ID`）与 `ID`（`asField({ type: new GraphQLNonNull(GraphQLID) })`，输出 `ID!`）。`z.string()` 输出 `String`，`.nullish()` 不会撤销 `GraphQLNonNull`。
9. 只要有任何解析函数或中间件调用 `useContext<Context>()`，就必须把 `asyncContextProvider` 传给 `weave`；缺少它时 `useContext()` 会抛错。如果没有任何地方调用 `useContext()`，则不要传。
10. 必须把每个 `authScopes` 改写为 `Middleware`。操作使用 `.use(guard)`；对象的属性使用 `resolver.of` 中的 `field(...).use(guard).resolve(...)`。加在 query 上的守卫不会保护其返回对象的字段。
11. 必须把 `builder.addScalarType` 与 `Date` 映射到 `ZodWeaver.config({ presetGraphQLType })`。枚举写成 `z.enum([...]).meta({ title })`。联合成员是带 `__typename` 字面量的 `z.object`，用 `z.discriminatedUnion("__typename", [...]).meta({ title })` 组合。
12. 必须用 `field(...).load(...)` 或解析器工厂的 `relationField()` 替代 N+1 写法（`loadableObject`、`t.loadable`、Prisma/Drizzle 关联插件）。测试中执行时要传入 `contextValue: {}`，否则批处理不会生效。
13. 必须用 `weave(ZodWeaver, config, ...resolvers)` 替代 `builder.toSchema()`（仅在规则 9 适用时才加入 `asyncContextProvider`）。没有任何解析器可达的 Silk 不会出现在 SDL 中。
14. 禁止从 query 或字段返回接口 Silk。在实现类型上声明 `asObjectType({ interfaces: [Iface] })`，并返回联合类型。
15. 禁止凭猜测手工翻译 Relay（`builder.node`、`t.connection`）、`@pothos/plugin-errors`、`@pothos/plugin-sub-graph`、`@pothos/plugin-smart-subscriptions`。应当停下，该模块继续使用 Pothos。
16. 在每个模块都通过规则 1 之前，禁止卸载任何 `@pothos/*` 包，也禁止在同一文件中混用 `builder` 与 GQLoom 解析器。

## 何时迁移与何时停止

适合迁移的情形：

- Schema 主要是普通对象、枚举、联合、输入与简单解析函数，`t.exposeX` 与 `objectRef` 的样板代码是主要成本；
- 项目已经为每个类型维护了 Zod 或 Valibot Schema、Prisma 模型或 Drizzle 表，Pothos 成了第三份声明；
- 只是为了校验参数才使用 `@pothos/plugin-zod` 或 `@pothos/plugin-validation`；
- 使用 `@pothos/plugin-scope-auth` 做中间件即可表达的角色检查。

出现下列依赖时，请先评估架构，不要直接迁移：

- Relay：`builder.node`、`t.connection`、`prismaConnection`、`drizzleConnection`、全局 ID。GQLoom 没有 Relay 辅助工具，需要手写 `Connection`、`Edge`、`PageInfo` 类型与游标逻辑，且 SDL 会不同。
- `@pothos/plugin-errors`、`@pothos/plugin-sub-graph`、`@pothos/plugin-smart-subscriptions` 以及 Pothos 的“变体”（`variant`、`Viewer` 风格的 Prisma/Drizzle 变体）。GQLoom 没有对应能力。
- 声明类型为 GraphQL 接口的字段（例如 `node(id): Node`）。GQLoom 无法从字段返回接口 Silk（见[陷阱](#陷阱)）；改用联合会改变 SDL。
- `@pothos/plugin-prisma-utils` 或 `@pothos/plugin-drizzle` 生成的过滤与排序输入。GQLoom 解析器工厂生成的输入类型名不同，在客户端迁移之前请保持这些操作手写。
- Pothos 的 Prisma/Drizzle 插件在嵌套选择集上做的查询规划（单个 `include` 树）。GQLoom 按关联字段分批加载。请在迁移前后对比查询次数。

按模块逐步迁移。迁移期间保留 `@pothos/core`。两个 `GraphQLSchema` 实例可以共存，并通过 [`mergeSchemas`](https://the-guild.dev/graphql/tools/docs/schema-merging) 合并，或分别挂载到不同的 HTTP 路由。

## 关键迁移实践

### 骨架

安装依赖并删除 builder 模块：

<!--@include: @/snippets/install-zod.md-->

创建 weave 入口。全局标量与所有解析器都在这里汇合。只有当某个解析函数或中间件调用 `useContext()` 时才需要加入 `asyncContextProvider`（见[鉴权与上下文](#鉴权与上下文)）：

```ts twoslash
import { weave, resolver, query } from "@gqloom/core"
import { ZodWeaver } from "@gqloom/zod"
import * as z from "zod"

const helloResolver = resolver({
  hello: query(z.string()).resolve(() => "Hello"),
})

export const schema = weave(ZodWeaver, helloResolver)
```

用打印 Pothos Schema 时相同的方式打印 GQLoom Schema，并在每个模块迁移后比较两个文件：

```ts
import { writeFileSync } from "node:fs"
import { lexicographicSortSchema, printSchema } from "graphql"
import { schema } from "./schema"

writeFileSync("after.graphql", printSchema(lexicographicSortSchema(schema)))
```

### 类型

每个 Pothos 对象对应一个 Zod 对象。用 `.meta({ title })` 命名，用 `.describe()` 或 `.meta({ description })` 添加描述。

```ts
// Pothos
const User = builder.objectRef<IUser>("User").implement({
  fields: (t) => ({
    id: t.exposeID("id"),
    firstName: t.exposeString("firstName"),
  }),
})
```

```ts twoslash
import { asField } from "@gqloom/zod"
import { GraphQLID } from "graphql"
import * as z from "zod"

const NullableID = z.string().register(asField, { type: GraphQLID })

export const User = z
  .object({
    id: NullableID,
    firstName: z.string().nullish(),
  })
  .meta({ title: "User" })
```

可空性以打印出的 SDL 为准。下表对应 Pothos 4 的默认行为：

| Pothos 4（默认 builder） | SDL | Zod 输出 | Zod 输入 |
| --- | --- | --- | --- |
| `t.string({ resolve })` | `String` | `z.string().nullish()` | |
| `t.string({ nullable: false, resolve })` | `String!` | `z.string()` | |
| `t.arg.string()` | `String` | | `z.string().nullish()` |
| `t.arg.string({ required: true })` | `String!` | | `z.string()` |
| `t.field({ type: [Post], nullable: true })` | `[Post!]` | `z.array(Post).nullish()` | |
| `t.field({ type: [Post], nullable: { list: true, items: true } })` | `[Post]` | `z.array(Post.nullish()).nullish()` | |

若设置了 `defaultFieldNullability: false`（或使用 Pothos 3），第一行应为 `String!`。之后再收紧可空字段属于有意的 Schema 变更，请在 diff 为空之后再做，不要在移植过程中做。

Pothos 只暴露你用 `t.expose*` 列出的字段。Zod 对象会暴露全部属性，因此要在 `resolver.of` 中隐藏 Pothos 保持私有的属性（外键、密码哈希等）：

```ts
const Comment = z
  .object({ id: NullableID, authorId: z.string(), comment: z.string().nullish() })
  .meta({ title: "Comment" })

const commentFields = resolver.of(Comment, {
  authorId: field.hidden, // [!code hl]
})
```

### 解析器

根字段放在 `resolver` 中，对象的字段放在 `resolver.of` 中。参数是传给 `.input` 的单个对象。

```ts
// Pothos
builder.queryType({
  fields: (t) => ({
    user: t.field({
      type: User,
      nullable: true,
      args: { id: t.arg.id({ required: true }) },
      resolve: (_root, args) => Users.get(String(args.id)),
    }),
  }),
})
```

```ts twoslash
import { field, query, resolver } from "@gqloom/core"
import { asField } from "@gqloom/zod"
import { GraphQLID, GraphQLNonNull } from "graphql"
import * as z from "zod"

const NullableID = z.string().register(asField, { type: GraphQLID })
const ID = z.string().register(asField, { type: new GraphQLNonNull(GraphQLID) })

const User = z
  .object({ id: NullableID, firstName: z.string().nullish(), lastName: z.string().nullish() })
  .meta({ title: "User" })

const users = new Map<string, z.infer<typeof User>>()

export const queries = resolver({
  user: query(User.nullish())
    .input({ id: ID })
    .resolve(({ id }) => users.get(id)),
})

export const userFields = resolver.of(User, {
  fullName: field(z.string().nullish()).resolve(
    (user) => `${user.firstName} ${user.lastName}`
  ),
})
```

不要把 query 或 mutation 传给 `resolver.of`。不要把 `resolve` 逻辑写进 `z.object`。

### 鉴权与上下文

Pothos 从每个解析函数的第三个参数读取上下文，并在服务端创建它。GQLoom 通过 `useContext()` 读取，服务端的创建方式相同。不需要 `initContextCache()`。

```ts twoslash
// @filename: schema.ts
import { query, resolver, weave } from "@gqloom/core"
import { asyncContextProvider } from "@gqloom/core/context"
import { ZodWeaver } from "@gqloom/zod"
import * as z from "zod"

const helloResolver = resolver({ hello: query(z.string()).resolve(() => "hi") })
export const schema = weave(ZodWeaver, asyncContextProvider, helloResolver)
// @filename: server.ts
// ---cut---
import { createServer } from "node:http"
import { createYoga } from "graphql-yoga"
import { schema } from "./schema"

declare function getUser(authorization: string | null): Promise<{ id: string } | null>

const yoga = createYoga({
  schema,
  context: async ({ request }) => ({
    user: await getUser(request.headers.get("authorization")),
  }),
})

createServer(yoga).listen(3000)
```

每个 Pothos `authScopes` 都变成一个中间件。Pothos 中包含多个键的 scope map 是“任意一个满足”；请写出你真正需要的条件。

```ts
// Pothos (@pothos/plugin-scope-auth)
builder.queryType({
  fields: (t) => ({
    message: t.string({
      nullable: true,
      authScopes: { loggedIn: true },
      resolve: () => "hi",
    }),
  }),
})
builder.objectField(Article, "internalNotes", (t) =>
  t.exposeString("internalNotes", { authScopes: { employee: true } })
)
```

```ts twoslash
import { field, query, resolver, type Middleware } from "@gqloom/core"
import { useContext } from "@gqloom/core/context"
import { GraphQLError } from "graphql"
import * as z from "zod"

interface Ctx {
  user: { id: string; employee: boolean } | null
}

const loggedIn: Middleware = (next) => {
  if (useContext<Ctx>().user == null) throw new GraphQLError("Not authorized")
  return next()
}

const employee: Middleware = (next) => {
  if (!useContext<Ctx>().user?.employee) throw new GraphQLError("Not authorized")
  return next()
}

const Article = z
  .object({ id: z.string(), internalNotes: z.string() })
  .meta({ title: "Article" })

export const queries = resolver({
  message: query(z.string().nullish())
    .use(loggedIn) // [!code hl]
    .resolve(() => "hi"),
})

export const articleFields = resolver.of(Article, {
  internalNotes: field(z.string())
    .use(employee) // [!code hl]
    .resolve((article) => article.internalNotes),
})
```

对于 Pothos 在类型级别（`builder.objectType`）设置的 `authScopes`，请为每个需要保护的字段添加 `field(...).use(guard)`；只存在于 Silk 上的属性不会执行任何中间件。

### Prisma 与 Drizzle 插件

Pothos 插件把模型映射为 GraphQL 类型（`prismaObject`、`drizzleObject`），用 `t.expose*` 暴露列，并根据选择集规划查询。在 GQLoom 中模型本身就是 Silk：没有映射调用，也没有 `PrismaTypes` 泛型。CRUD 与关联使用解析器工厂；手写查询时使用 `useSelectedFields` / `useSelectedColumns`。

Prisma。把 `pothos` 生成器块替换为 GQLoom 的生成器，然后运行 `npx prisma generate`：

```prisma
generator gqloom {
  provider = "prisma-gqloom"
}
```

```ts
// Pothos
const builder = new SchemaBuilder<{ PrismaTypes: PrismaTypes; Context: { userId: number } }>({
  plugins: [PrismaPlugin],
  prisma: { client: prisma, dmmf: getDatamodel() },
})

builder.prismaObject("User", {
  fields: (t) => ({
    id: t.exposeID("id"),
    email: t.exposeString("email"),
    posts: t.relation("posts"),
  }),
})

builder.queryType({
  fields: (t) => ({
    me: t.prismaField({
      type: "User",
      nullable: true,
      resolve: (query, _root, _args, ctx) =>
        prisma.user.findUnique({ ...query, where: { id: ctx.userId } }),
    }),
  }),
})
```

```ts
// GQLoom
import { query, resolver, weave } from "@gqloom/core"
import { asyncContextProvider, useContext } from "@gqloom/core/context"
import { PrismaResolverFactory } from "@gqloom/prisma"
import { useSelectedFields } from "@gqloom/prisma/context"
import { ZodWeaver } from "@gqloom/zod"
import { Post, User } from "./generated/gqloom"
import { prisma } from "./prisma"

const userFactory = new PrismaResolverFactory(User, prisma)

const userResolver = resolver.of(User, {
  me: query(User.nullish()).resolve(() =>
    prisma.user.findUnique({
      select: useSelectedFields(User),
      where: { id: useContext<{ userId: number }>().userId },
    })
  ),
  posts: userFactory.relationField("posts"),
})

export const schema = weave(ZodWeaver, asyncContextProvider, userResolver)
```

用 `field.hidden` 隐藏列（例如 `password: field.hidden`），而不是靠“不在字段列表里”。对于 Prisma 模型，`@id` 列会输出为 `ID`。

Drizzle。表通过 `drizzleSilk` 包装；工厂接收 Drizzle 客户端与表。下面的代码在本站构建所用的 Drizzle 版本下通过类型检查：

```ts
// Pothos
builder.drizzleObject("users", {
  name: "User",
  fields: (t) => ({
    firstName: t.exposeString("firstName"),
    fullName: t.string({
      select: { columns: { firstName: true, lastName: true } },
      resolve: (user) => `${user.firstName} ${user.lastName}`,
    }),
    posts: t.relation("posts"),
  }),
})

builder.queryType({
  fields: (t) => ({
    user: t.drizzleField({
      type: "users",
      nullable: true,
      args: { id: t.arg.int({ required: true }) },
      resolve: (query, _root, args) =>
        db.query.users.findFirst(query({ where: { id: args.id } })),
    }),
  }),
})
```

```ts twoslash
// @filename: schema.ts
import { drizzleSilk } from "@gqloom/drizzle"
import * as t from "drizzle-orm/sqlite-core"

export const users = drizzleSilk(
  t.sqliteTable("users", {
    id: t.int().primaryKey({ autoIncrement: true }),
    firstName: t.text().notNull(),
    lastName: t.text().notNull(),
    password: t.text(),
  })
)

export const posts = drizzleSilk(
  t.sqliteTable("posts", {
    id: t.int().primaryKey({ autoIncrement: true }),
    title: t.text().notNull(),
    authorId: t.int().references(() => users.id, { onDelete: "cascade" }),
  })
)
// @filename: relations.ts
import { defineRelations } from "drizzle-orm"
import * as tables from "./schema"

export const relations = defineRelations(tables, (r) => ({
  users: {
    posts: r.many.posts({ from: r.users.id, to: r.posts.authorId }),
  },
  posts: {
    author: r.one.users({ from: r.posts.authorId, to: r.users.id }),
  },
}))
// @filename: resolver.ts
// ---cut---
import { field, resolver } from "@gqloom/core"
import { drizzleResolverFactory } from "@gqloom/drizzle"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/libsql"
import * as z from "zod"
import { relations } from "./relations"
import { users } from "./schema"

const db = drizzle({
  relations,
  connection: { url: process.env.DB_FILE_NAME! },
})

const usersFactory = drizzleResolverFactory(db, users)

export const usersResolver = resolver.of(users, {
  user: usersFactory.selectSingleQuery().input(
    z
      .object({ id: z.int() })
      .transform(({ id }) => ({ where: eq(users.id, id) }))
  ),
  fullName: field(z.string())
    .derivedFrom("firstName", "lastName")
    .resolve((user) => `${user.firstName} ${user.lastName}`),
  posts: usersFactory.relationField("posts"),
  password: field.hidden,
})
```

`selectSingleQuery().input(...)` 替代了 `t.drizzleField` 的 `args`：Zod 对象定义 GraphQL 参数，`.transform` 把它们转换为 Drizzle 查询选项。`derivedFrom` 相当于 Pothos 的 `select: { columns }`：告诉选择逻辑计算字段需要哪些列。

### N+1

Pothos 用 `loadableObject` 或 `t.loadable` 解决 N+1，它们通过共享的 DataLoader 把返回的键转换为对象。在 GQLoom 中，把 `.load()` 加在字段上。加载函数一次接收同一时刻的所有 parent，并且必须按相同顺序为每个 parent 返回一个结果。

```ts
// Pothos (@pothos/plugin-dataloader)
const User = builder.loadableObject("User", {
  load: (ids: string[], ctx) => ctx.loadUsersById(ids),
  fields: (t) => ({ id: t.exposeID("id") }),
})

builder.objectField(Post, "author", (t) =>
  t.field({ type: User, resolve: (post) => post.authorId })
)
```

```ts twoslash
import { field, resolver } from "@gqloom/core"
import * as z from "zod"

const User = z.object({ id: z.string() }).meta({ title: "User" })
const Post = z.object({ id: z.string(), authorId: z.string() }).meta({ title: "Post" })

declare function loadUsersById(ids: string[]): Promise<(z.infer<typeof User> | null)[]>

export const postFields = resolver.of(Post, {
  authorId: field.hidden,
  author: field(User.nullish()).load((posts) =>
    loadUsersById(posts.map((post) => post.authorId))
  ),
})
```

在示例数据上（5 篇文章，查询 `posts { id author { id } }`），传入上下文对象时批处理函数只执行 1 次，不传上下文对象时执行 5 次：批处理以请求上下文对象为键。Yoga 等服务端总会提供上下文对象；在单元测试中调用 `graphql()` 时请传入 `contextValue: {}`。

迁移前后请自行核对查询次数：开启 `log: ["query"]`（Prisma）或 `logger: true`（Drizzle），对比同一请求的语句条数。使用 ORM 插件时，`relationField` 替代 `t.relation`；不要假设它会生成同样的单条联表查询。

## 陷阱

每一项都给出实际观察到的错误结果与修正方式。

- 可空性：Pothos 4 的 SDL 是 `title: String`。写成 `title: z.string()` 会输出 `String!`，改变错误的传播方式。写成 `z.string().nullable()` 虽然输出 `String`，但当解析函数返回 `undefined`（如 `Map.get(...)`）时无法通过类型检查：`Type 'IUser | undefined' is not assignable to type 'MayPromise<... | null>'`。

  ```ts
  const Post = z.object({ title: z.string() }).meta({ title: "Post" }) // [!code --]
  const Post = z.object({ title: z.string().nullish() }).meta({ title: "Post" }) // [!code ++]
  ```

- 所有属性都会被暴露。Zod 对象没有“不要 `t.expose` 这一列”的对应写法。缺少 `field.hidden` 时，`Comment` 的 SDL 会多出 `authorId: String!` 与 `postId: String!`。

  ```ts
  const commentFields = resolver.of(Comment, {
    authorId: field.hidden, // [!code ++]
    postId: field.hidden, // [!code ++]
    author: field(User.nullish()).resolve((comment) => Users.get(comment.authorId)),
  })
  ```

- ID 标量：`z.string()` 输出 `String`。`asField({ type })` 会替换 GraphQL 类型并丢失 `!`，而对 `GraphQLNonNull` 类型再调用 `ID.nullish()` 仍然输出 `ID!`。使用规则 8 的两个辅助常量，并按 SDL 选择。

  ```ts
  const id = z.string() // 输出 String // [!code --]
  const ID = z.string().register(asField, { type: new GraphQLNonNull(GraphQLID) }) // ID! // [!code ++]
  const NullableID = z.string().register(asField, { type: GraphQLID }) // ID // [!code ++]
  ```

- 日期：`z.date()` 输出 `String`。用 `ZodWeaver.config({ presetGraphQLType })` 注册一次标量（见映射表部分），并把配置传给 `weave`。

- 输入类型与对象类型是不同的类型。同一个 Silk 同时用于两者，会在 `weave` 时失败：`Schema must contain uniquely named types but contains multiple types named "P"`。

  ```ts
  mk: mutation(P).input({ p: P }) // [!code --]
  mk: mutation(P).input({ p: PInput }) // [!code ++]
  ```

- 没有 `asyncContextProvider` 时调用 `useContext()`，第一个调用它的解析函数会抛出 `Cannot read properties of undefined (reading 'user')`。

  ```ts
  weave(ZodWeaver, rootResolver) // [!code --]
  weave(ZodWeaver, asyncContextProvider, rootResolver) // [!code ++]
  ```

- 加在操作上的中间件只保护该操作。返回对象的属性除非在 `resolver.of` 中声明为字段，否则不会执行任何中间件，因此加在某个 query 上的守卫，无法阻止同一属性通过另一个 query 或关联字段被访问。请把 Pothos 的字段级 `authScopes` 移到字段上：

  ```ts
  const secretFields = resolver.of(Sec, {
    secret: field(z.string()).use(adminOnly).resolve((sec) => sec.secret), // [!code ++]
  })
  ```

- 接口类型的字段。如果 `query(Node)` 中的 `Node` 同时用于 `asObjectType({ interfaces: [Node] })`，会失败并报 `Schema must contain uniquely named types but contains multiple types named "Node"`。请返回实现类型的联合（`z.discriminatedUnion("__typename", [Dog, Cat])`），并让客户端使用内联片段；SDL 会改变，应视为契约变更。

- 校验：GQLoom 在 `resolve` 之前按 Zod Schema 校验参数。失败时请求被拒绝，并返回 `extensions.issues`（例如 `{"message":"Invalid email address","extensions":{"issues":[...]}}`）。请更新解析 `@pothos/plugin-zod` 或 `@pothos/plugin-validation` 错误格式的客户端。

- `.optional()` 输入会拒绝显式的 `null`。`z.int().optional()` 输出 `Int`，但 `{ a(x: null) }` 会失败并报 `Invalid input: expected number, received null`，而 Pothos 的 `t.arg.int()` 接受它。每个可选的 Pothos 参数与输入字段都应使用 `.nullish()`。

  ```ts
  .input({ take: z.int().optional() }) // [!code --]
  .input({ take: z.int().nullish() }) // [!code ++]
  ```

## 验证

迁移的目标是契约不变、行为不变。

1. 在改动之前，打印 Pothos 的 SDL：

   ```ts
   import { writeFileSync } from "node:fs"
   import { lexicographicSortSchema, printSchema } from "graphql"
   import { builder } from "./builder"

   writeFileSync("before.graphql", printSchema(lexicographicSortSchema(builder.toSchema())))
   ```

2. 每迁移一个模块，用相同的调用打印 GQLoom 的 SDL（见[骨架](#骨架)）并比较：

   ```sh
   diff before.graphql after.graphql
   ```

   输出必须为空。应当修改 Schema，而不是修改文件。

3. 对两份 Schema 重放请求并比较 JSON。参考移植使用的是同样的四条请求：

   ```ts twoslash
   import { query, resolver, weave } from "@gqloom/core"
   import { ZodWeaver } from "@gqloom/zod"
   import { graphql } from "graphql"
   import * as z from "zod"

   const helloResolver = resolver({
     hello: query(z.string()).input({ name: z.string().nullish() }).resolve(({ name }) => `Hello, ${name ?? "World"}`),
   })
   const schema = weave(ZodWeaver, helloResolver)

   const result = await graphql({
     schema,
     source: `{ hello(name: "Pothos") }`,
     contextValue: {},
   })
   console.log(JSON.stringify(result))
   // {"data":{"hello":"Hello, Pothos"}}
   ```

   请重放客户端真实发送的 query、mutation 与 subscription。其中要包含一条缺少必填参数的请求，校验错误文本也必须一致。解析函数中的鉴权与输入校验错误在 `extensions` 上会有差异（见[陷阱](#陷阱)）；请有意识地更新断言。

## 参考实现

下面移植 Pothos 官方 [`simple-interfaces`](https://github.com/hayes/pothos/tree/main/examples/simple-interfaces) 示例。`data.ts` 保持不变（保留 `IUser`、`IPost`、`IComment` 接口与三个 `Map`），`builder.ts` 被删除，`server.ts` 仅在 `schema` 的导出路径不同时才需要修改导入。

`@pothos/core` 4.18.0 实际打印出的 SDL 中所有字段都是可空的，这与该示例 README 中的非空 SDL 不同（README 对应较旧的默认值）。移植以 Pothos 实际打印的 SDL 为准：

```graphql
type Comment {
  author: User
  comment: String
  id: ID
  post: Post
}

type Post {
  author: User
  comments: [Comment!]
  content: String
  id: ID
  title: String
}

type Query {
  post(id: ID!): Post
  posts(skip: Int, take: Int): [Post!]
  user(id: ID!): User
}

type User {
  comments: [Comment!]
  firstName: String
  fullName: String
  id: ID
  lastName: String
  posts: [Post!]
}
```

::: code-group

```ts twoslash [GQLoom]
// @filename: data.ts
export interface IUser { id: string; firstName: string; lastName: string }
export interface IPost { id: string; authorId: string; title: string; content: string }
export interface IComment { id: string; postId: string; authorId: string; comment: string }
export const Users = new Map<string, IUser>()
export const Posts = new Map<string, IPost>()
export const Comments = new Map<string, IComment>()
// @filename: schema.ts
// ---cut---
import { field, query, resolver, weave } from "@gqloom/core"
import { ZodWeaver, asField } from "@gqloom/zod"
import { GraphQLID, GraphQLNonNull } from "graphql"
import * as z from "zod"
import { Comments, Posts, Users } from "./data"

const NullableID = z.string().register(asField, { type: GraphQLID })
const ID = z.string().register(asField, { type: new GraphQLNonNull(GraphQLID) })

const User = z
  .object({
    id: NullableID,
    firstName: z.string().nullish(),
    lastName: z.string().nullish(),
  })
  .meta({ title: "User" })

const Post = z
  .object({
    id: NullableID,
    authorId: z.string(),
    title: z.string().nullish(),
    content: z.string().nullish(),
  })
  .meta({ title: "Post" })

const Comment = z
  .object({
    id: NullableID,
    authorId: z.string(),
    postId: z.string(),
    comment: z.string().nullish(),
  })
  .meta({ title: "Comment" })

const userFields = resolver.of(User, {
  fullName: field(z.string().nullish()).resolve(
    (user) => `${user.firstName} ${user.lastName}`
  ),
  posts: field(z.array(Post).nullish()).resolve((user) =>
    [...Posts.values()].filter((post) => post.authorId === user.id)
  ),
  comments: field(z.array(Comment).nullish()).resolve((user) =>
    [...Comments.values()].filter((comment) => comment.authorId === user.id)
  ),
})

const postFields = resolver.of(Post, {
  authorId: field.hidden,
  author: field(User.nullish()).resolve((post) => Users.get(post.authorId)),
  comments: field(z.array(Comment).nullish()).resolve((post) =>
    [...Comments.values()].filter((comment) => comment.postId === post.id)
  ),
})

const commentFields = resolver.of(Comment, {
  authorId: field.hidden,
  postId: field.hidden,
  author: field(User.nullish()).resolve((comment) =>
    Users.get(comment.authorId)
  ),
  post: field(Post.nullish()).resolve((comment) => Posts.get(comment.postId)),
})

const DEFAULT_PAGE_SIZE = 10

const queries = resolver({
  post: query(Post.nullish())
    .input({ id: ID })
    .resolve(({ id }) => Posts.get(id)),
  posts: query(z.array(Post).nullish())
    .input({ take: z.int().nullish(), skip: z.int().nullish() })
    .resolve(({ skip, take }) =>
      [...Posts.values()].slice(
        skip ?? 0,
        (skip ?? 0) + (take ?? DEFAULT_PAGE_SIZE)
      )
    ),
  user: query(User.nullish())
    .input({ id: ID })
    .resolve(({ id }) => Users.get(id)),
})

export const schema = weave(
  ZodWeaver,
  queries,
  userFields,
  postFields,
  commentFields
)
```

```ts [Pothos]
// builder.ts
import SchemaBuilder from "@pothos/core"

export const builder = new SchemaBuilder({})

// schema.ts
import { builder } from "./builder.ts"
import { Comments, type IComment, type IPost, type IUser, Posts, Users } from "./data.ts"

export const User = builder.objectRef<IUser>("User")
export const Post = builder.objectRef<IPost>("Post")
export const Comment = builder.objectRef<IComment>("Comment")

User.implement({
  fields: (t) => ({
    id: t.exposeID("id"),
    firstName: t.exposeString("firstName"),
    lastName: t.exposeString("lastName"),
    fullName: t.string({
      resolve: (user) => `${user.firstName} ${user.lastName}`,
    }),
    posts: t.field({
      type: [Post],
      resolve: (user) => [...Posts.values()].filter((post) => post.authorId === user.id),
    }),
    comments: t.field({
      type: [Comment],
      resolve: (user) => [...Comments.values()].filter((comment) => comment.authorId === user.id),
    }),
  }),
})

Post.implement({
  fields: (t) => ({
    id: t.exposeID("id"),
    title: t.exposeString("title"),
    content: t.exposeString("content"),
    author: t.field({
      type: User,
      nullable: true,
      resolve: (post) => [...Users.values()].find((user) => user.id === post.authorId),
    }),
    comments: t.field({
      type: [Comment],
      resolve: (post) => [...Comments.values()].filter((comment) => comment.postId === post.id),
    }),
  }),
})

Comment.implement({
  fields: (t) => ({
    id: t.exposeID("id"),
    comment: t.exposeString("comment"),
    author: t.field({
      type: User,
      nullable: true,
      resolve: (comment) => [...Users.values()].find((user) => user.id === comment.authorId),
    }),
    post: t.field({
      type: Post,
      resolve: (comment) => [...Posts.values()].find((post) => post.id === comment.postId),
    }),
  }),
})

const DEFAULT_PAGE_SIZE = 10

builder.queryType({
  fields: (t) => ({
    post: t.field({
      type: Post,
      nullable: true,
      args: { id: t.arg.id({ required: true }) },
      resolve: (_root, args) => Posts.get(String(args.id)),
    }),
    posts: t.field({
      type: [Post],
      nullable: true,
      args: { take: t.arg.int(), skip: t.arg.int() },
      resolve: (_root, { skip, take }) =>
        [...Posts.values()].slice(skip ?? 0, (skip ?? 0) + (take ?? DEFAULT_PAGE_SIZE)),
    }),
    user: t.field({
      type: User,
      nullable: true,
      args: { id: t.arg.id({ required: true }) },
      resolve: (_root, args) => Users.get(String(args.id)),
    }),
  }),
})

export const schema = builder.toSchema()
```

:::

需要了解的差异：

- Pothos 逐个列出 `t.exposeID("id")`、`t.exposeString("title")` 等。Zod 对象只需列出一次相同的属性，`authorId` / `postId` 通过 `field.hidden` 保持私有。
- Pothos 的 `User.implement`、`Post.implement`、`Comment.implement` 通过引用相互指向。GQLoom 没有循环引用：关联字段位于 `resolver.of` 中，并引用只包含标量属性的 Silk。
- Pothos 对可空字段返回 `Users.get(...)`，即可能为 undefined 的值。移植后的解析函数做法相同，这正是输出使用 `.nullish()` 的原因：它接受解析函数返回的 `undefined`，GraphQL 输出 `null`。
- 与 Pothos 4 一样，`post.id`、`user.id`、`comment.id` 输出 `ID`，因为 `NullableID` 是不带 `NonNull` 的 `GraphQLID`。查询参数使用 `ID`，因此输出 `ID!`。

本次移植的验证：`printSchema(lexicographicSortSchema(schema))` 的 `diff` 为空；使用相同的种子数据，下列请求在两份 Schema 上返回完全相同的 JSON：`{ post(id: "2") { id title author { fullName posts { id } } comments { comment post { id } } } }`、`{ posts(take: 2, skip: 1) { id } user(id: "3") { fullName comments { id } } }`、`{ post(id: "999") { id } }` 以及 `{ post { id } }`（缺少必填参数）。

## 清理

所有模块都通过 SDL diff 与请求重放之后：

1. 卸载 Pothos 相关包（只卸载实际安装的）：

   ```sh
   npm uninstall @pothos/core @pothos/plugin-prisma @pothos/plugin-drizzle \
     @pothos/plugin-scope-auth @pothos/plugin-dataloader @pothos/plugin-relay \
     @pothos/plugin-zod @pothos/plugin-validation @pothos/plugin-with-input \
     @pothos/plugin-simple-objects @pothos/plugin-complexity dataloader
   ```

   只有在其他代码仍导入 `dataloader` 时才保留它。使用 `pnpm remove`、`yarn remove` 或 `bun remove` 执行等价操作。

2. 删除残留的生成文件与配置：

   - 在 `schema.prisma` 中删除 `generator pothos { provider = "prisma-pothos-types" ... }`，并删除其 `output` 指向的文件（例如 `./generated.ts`）。没有设置 `output` 时，类型被写入 `node_modules/@pothos/plugin-prisma/`，卸载后随之消失。然后运行 `npx prisma generate`。
   - 删除 `builder.ts` 以及所有 `import { builder }` 行。
   - 重写示例或包的 `README.md`，使现行文档不再描述 Pothos API：把标题和包列表中的 `@pothos/core` 改为 `@gqloom/core`、`@gqloom/zod`、`zod`，并把其中内嵌的 SDL 替换为 `printSchema(lexicographicSortSchema(schema))` 的输出。从 Pothos 示例复制来的 README 往往带着旧的全非空 SDL（Pothos 3 的默认值），不要保留。
   - 如果复制了整个 Pothos 示例目录，其中的 `CHANGELOG.md` 是历史记录，每个版本都列出 `@pothos/core`。请删除它，或保留它并在下面的检查中排除。
   - 删除只为 `SchemaBuilder` 服务的 `PrismaTypes`、`DrizzleRelations`、`Context`、`AuthScopes` 泛型。
   - 最后一次比较之后删除 `before.graphql`，或将其保留为契约测试。

3. 检查是否还有残留。请在仓库根目录执行，以便搜索到 `README.md` 与配置文件，而不只是 `src/`。只排除 `node_modules`、锁文件与 `CHANGELOG.md`（历史变更日志可能仍提到 Pothos）：

   ```sh
   rg -n -i "@pothos|SchemaBuilder|prisma-pothos-types|pothos" . \
     -g '!node_modules' -g '!CHANGELOG.md' \
     -g '!pnpm-lock.yaml' -g '!package-lock.json' -g '!yarn.lock' -g '!bun.lock'
   ```

   该命令必须没有任何输出。`README.md` 中出现任何匹配都说明第 2 步还没有完成。

相关文档：

- [Zod](../schema/zod.md)：`.meta()`、`.describe()`、枚举、联合、接口、`asObjectType` / `asField`
- [解析器](../resolver.md)：`resolver.of`、`query`、`mutation`、`subscription`、`field`
- [中间件](../middleware.md)：鉴权与全局中间件
- [上下文](../context.md)：`useContext` 与 `asyncContextProvider`
- [数据加载器](../dataloader.md)：`field().load()`
- [Prisma](../schema/prisma.md) 与 [Drizzle](../schema/drizzle.md)：Silk 与解析器工厂
