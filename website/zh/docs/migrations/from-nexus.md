# 从 Nexus 迁移到 GQLoom

## 为什么迁到 GQLoom

Nexus 与 GQLoom 都坚持无装饰器的代码优先（Code-First）路线，但两者的根基完全不同。

Nexus **以代码生成驱动类型安全**。你先在代码 DSL 中定义 GraphQL 类型，再依靠生成类型声明文件和路径映射配置，把接口层反过来对齐到数据模型与上下文。

GQLoom 则秉持**以运行时类型为中心的编织理念**。应用里已有的校验 Schema 与 ORM 模型本来就是最真实的数据契约，GraphQL Schema 直接从中「编织」而出——零代码生成、零映射配置，数据、逻辑与组装各归其位。

- **零代码生成，所写即所得的类型推导**

  Nexus 需要不断重新生成声明文件来维持类型安全，一旦生成滞后或配置脱节，类型就会失真。GQLoom 完全依靠原生 TypeScript 类型推导，没有任何生成产物或后台监听步骤——修改模型与解析器的瞬间，编辑器提示与编译检查同步生效。

- **单一事实源，类型、校验与接口三合一**

  Nexus 只描述 GraphQL 接口层，既不内置输入校验，也无法直接复用现有的校验模型与 ORM 实体，字段与规则很容易漂移。GQLoom 直接把你已有的校验 Schema 与数据库模型编织为图类型——写一次定义，同时得到静态类型、自动输入校验与对外接口。

- **现代生态与开箱即用的完整能力**

  相比逐步停滞的 Nexus 插件生态，GQLoom 面向现代 TypeScript 后端设计，直接对接主流校验库与 ORM，并内置解析器工厂、关联批处理、中间件、上下文与订阅等核心能力；少写大量胶水代码，也能平滑运行在各类现代服务端与边缘运行时中。

- **彻底解耦的模块，轻松测试与复用**

  Nexus 将字段锁在依赖全局类型注册的回调中，业务代码与 GraphQL 深度耦合。GQLoom 中的 Schema 与解析器都是独立纯粹的普通对象，只在入口处显式组装——业务逻辑既方便直接单元测试，也能脱离 GraphQL 独立运行。

选择 GQLoom 不是权宜替代，而是一次架构减负：原有的 GraphQL 能力都有直接对应的迁移路径，完成后不再有代码生成与历史插件包袱，只留下单一事实源的现代 TypeScript 代码库。

## 概述与心智转变

| | Nexus | GQLoom |
| --- | --- | --- |
| 类型 | `objectType` / `interfaceType`、`definition(t)` | Zod / Valibot / ORM 模型（Silk） |
| 操作 | `queryType` / `mutationType` / `subscriptionType` / `*Field` / `extendType` | `resolver({ ... })` 与 `resolver.of(Silk, { ... })` |
| Schema | `makeSchema({ types })` + `outputs` 产物生成 | `weave(ZodWeaver, ...resolvers)` 显式传入，无代码生成 |
| 类型安全 | 生成的 `typegen` + `sourceTypes` / `contextType` 配置 | 由 Schema 与 `useContext<Ctx>()` 原生推导 |
| 校验 | 手写校验或自定义插件 | Schema 本身，输入默认执行校验 |
| 鉴权 / 上下文 | `fieldAuthorizePlugin`（`authorize`）、`ctx` 参数 | 中间件（`.use()`）、`useContext()` |

迁移建议：

- 默认推荐使用 Zod（`@gqloom/zod`）。若项目中已使用 Valibot，或数据层采用 Prisma、Drizzle、MikroORM，可直接编织现有 Schema 或模型，无需再写一份平行的 `objectType` 声明。
- 对于大型项目，可在切换期间按模块渐进迁移：两个 `GraphQLSchema` 实例可暂时共存，并通过 [`mergeSchemas`](https://the-guild.dev/graphql/tools/docs/schema-merging) 合并或分别挂载到不同 HTTP 路由；当所有模块迁移完成后再彻底卸载 `nexus` 与所有 Nexus 插件，不留残留代码与配置。
- 对象 Silk 仅保留数据属性，计算字段与关联字段定义在 `resolver.of(Silk, { ... })` 中。可空性以打印出的 Nexus SDL 为准（可空输出和可选输入统一写 `.nullish()`），不要凭记忆猜，因为 Nexus 未开启 `nonNullDefaults` 时默认全部可空。

## 核心概念与映射表

下表列出两者概念与 API 存在差异的映射关系：

| Nexus | GQLoom | 注意 |
| --- | --- | --- |
| `makeSchema({ types, plugins, outputs, contextType, sourceTypes })` | `weave(ZodWeaver, config, ...resolvers)` | 调用 `useContext()` 时传入 `asyncContextProvider`；无需 `typegen` 与 `sourceTypes`；不可达的 Silk 不会出现在 SDL 中 |
| `objectType({ name, definition(t) { ... } })` | `z.object({ ... }).meta({ title })` | 计算字段与关联字段定义在 `resolver.of` 中，不写入 Silk |
| `t.string` / `t.int` / `t.float` / `t.boolean`（默认解析） | `z.object` 的属性 | 对象属性默认全部暴露；底层或私有属性用 `field.hidden` 隐藏 |
| `t.id` / `idArg()` | `asField({ type: GraphQLID })`（`NullableID`）/ `new GraphQLNonNull(GraphQLID)`（`ID`） | `z.string()` 输出 `String`，按 SDL 选择（规则 8） |
| `t.field` / `t.string(..., { resolve })` | `resolver.of(Silk, { name: field(type).resolve((parent) => ...) })` | `parent` 为 `resolve` 的第一个参数 |
| `extendType({ type: "User", definition })` | 另一个 `resolver.of(User, { ... })` | 可在不同模块扩展同一对象类型；扩展 `Query` 或 `Mutation` 改用 `resolver({ ... })` |
| `inputObjectType({ name, definition })` | 独立的 `z.object({ ... }).meta({ title })` | 不要和 Object 共用同一个 Silk |
| `queryType` / `mutationType` / `subscriptionType` / `*Field` | `resolver({ ... })` 中的 `query`、`mutation`、`subscription` | Subscription 使用 `.subscribe(async function* ...)` |
| `args`（`stringArg`、`intArg`、`floatArg`、`booleanArg`、`idArg`、`arg`） | `.input({ ... })` | 参数合并为一个对象 |
| `nonNull(T)` / `t.nonNull.*` 与默认 / `nullable(T)` / `t.nullable.*` | 不带修饰的 Zod 类型（`!`）与 `.nullish()`（可空） | Nexus 的 `nonNullDefaults` 默认为 `false`；以打印出的 SDL 为准 |
| `declarativeWrappingPlugin`（`nullable`、`required`、`list`） | 不带修饰的 Zod 类型、`.nullish()`、`z.array(...)` | 按打印出的 SDL 选择 |
| `list(T)` / `t.list.*` | `z.array(T)` | 在 `z.array` 内外组合 `.nullish()` 以匹配 `[T!]`、`[T]`、`[T!]!`、`[T]!` |
| `enumType({ name, members })` | `z.enum([...]).meta({ title })` | 带映射值的枚举可用 TypeScript `enum` 配合 `z.enum(TsEnum).meta({ title })` |
| `unionType({ name, definition, resolveType })` | `z.discriminatedUnion("__typename", [...]).meta({ title })` | 或 `z.union` 配合 `asUnionType` / `resolveType` |
| `interfaceType` + `t.implements(...)` + `t.modify(...)` | `silk(new GraphQLInterfaceType(...))` + `asObjectType({ interfaces: [I] })`，或 `z.discriminatedUnion` | 共享 `GraphQLInterfaceType` 可原样保留接口字段；见[接口](#接口) |
| `scalarType` / `asNexusMethod` / `decorateType` | `ZodWeaver.config({ presetGraphQLType })` 或 `asField({ type })` | `Date`（`z.ZodDate`）在 `presetGraphQLType` 中全局映射 |
| `ctx` 参数 + `contextType` | [`useContext<Ctx>()`](../context.md) | 必须传入 `asyncContextProvider` |
| `info` 参数 | `useResolverPayload().info` | |
| `fieldAuthorizePlugin`（`authorize`） | 使用 `.use()` 的[中间件](../middleware.md) | 操作使用 `.use()`，对象字段使用 `field().use()` |
| `nullabilityGuardPlugin`（`fallbackValues`） | 检查 `payload.info.returnType` 的全局 `Middleware` | 见[空值守卫与自定义插件](#空值守卫与自定义插件) |
| `queryComplexityPlugin`（`complexity`） | `extensions: { complexity }` | 仓库示例：`examples/query-complexity` |
| `connectionPlugin`（`t.connectionField`） | `PageInfo` / `*Edge` / `*Connection` Silk 辅助函数 | 见 [Relay 分页连接](#relay-分页连接) |
| 自定义 `plugin(...)`（`onCreateFieldResolver`、动态方法） | `Middleware` 与普通 TypeScript 字段/对象辅助函数 | 见[空值守卫与自定义插件](#空值守卫与自定义插件) |
| `ctx` / 数据源上的 `DataLoader` | [`field().load()`](../dataloader.md) | 测试中需传入 `contextValue: {}` |
| `nexus-prisma` / `nexus-plugin-prisma`（`t.model.*`、`t.crud.*`、`User.id`） | [Prisma](../schema/prisma.md)（`PrismaResolverFactory`、`relationField`） | 见 [Prisma 插件](#prisma-插件) |

常用字段选项映射：

- `description` → Silk 属性上使用 `z.describe()` 或 `z.meta({ description })`（操作与字段使用 `.description()`）
- `deprecation` → `.deprecationReason()`
- 参数上的 `default` → `.default(...)`（SDL 差异见[陷阱](#陷阱)）
- 可空输出 / 可选参数 → `.nullish()`（`[X]` 对应 `z.array(X.nullish()).nullish()`）
- `nonNull(...)` / `t.nonNull.*`（或 `nonNullDefaults: true` 下的字段）→ 不带修饰的 Zod 类型（省略 `.nullish()`）

普通名称与描述使用 `z.describe()` 或 `z.meta()` 声明，全局标量（如 `Date`）通过 `ZodWeaver.config({ presetGraphQLType })` 注册一次并传入 `weave`。仅在 Zod 元数据无法表达 GraphQL 特有配置时使用 `asObjectType` 与 `asField`，例如接口（`asObjectType({ interfaces })`）、`ID` 标量（`asField({ type })`）或 `extensions`。

## 规则

只读这一页的模型也必须遵守下列规则。每条规则在后文都有对应代码。

1. 必须在改动代码前保存 Nexus 的 SDL：把 `printSchema(lexicographicSortSchema(schema))` 写入 `before.graphql`。不要直接用 Nexus 未排序且带横幅注释的 `outputs.schema` 文件做对比。只有当 GQLoom 的 SDL `diff` 为空（或已按契约记录有意调整），且重放的请求返回一致的 JSON 时，迁移才算完成。
2. 必须从打印出的 SDL 抄可空性，不要凭记忆。Nexus 的 `nonNullDefaults` 默认为 `{ input: false, output: false }`，除非使用 `nonNull` 包装或在全局/类型级别设置了 `nonNullDefaults: true`，否则字段和参数默认全部可空。每个可空输出与每个可选输入都写成 `.nullish()`（统一写法；`.nullable()` 会让 TypeScript 拒绝返回 `undefined` 的解析函数），其余使用不带修饰的 Zod 类型。
3. 必须把每个 Nexus `objectType` 改写为一个 `z.object({ ... }).meta({ title: "Name" })`。不要照搬 `definition(t)`、`sourceTypes`、`typegen` 全局声明或 `NexusGen`。
4. 必须用 `resolver.of(Silk, { name: field(type).resolve((parent) => ...) })` 定义每个计算字段、关联字段、对 `sourceTypes` 字段的重命名映射以及 `t.modify` 覆写。`parent` 是 `resolve` 的第一个参数；没有 `t` 回调，也没有 `ctx` 参数。
5. 必须用 `resolver({ name: query(...) | mutation(...) | subscription(...) })` 定义每个根字段（无论是来自 `queryType`/`mutationType`/`subscriptionType`、`*Field` 还是 `extendType`）。参数只能通过 `.input({ ... })` 传入。
6. 必须用 `resolver.of` 中的 `name: field.hidden` 隐藏 Nexus 在 `objectType` 中没有暴露的属性（例如外键或 `sourceTypes` 内部字段）。Zod 对象会暴露全部属性。
7. 必须把 `inputObjectType` 声明为独立的 Silk，并各自使用 `.meta({ title })`。禁止把对象 Silk 当作输入。
8. 必须一次性定义 ID 辅助常量：`ID`（`z.string().register(asField, { type: new GraphQLNonNull(GraphQLID) })`，输出 `ID!`）与 `NullableID`（`z.string().nullish().register(asField, { type: GraphQLID })`，输出 `ID`，可接收省略或 `null` 的输入；若仅用于输出且底层确定为非空 `string`，可省略 `.nullish()`）。`z.string()` 输出 `String`，在 `asField` 之后再调用 `.nullish()` 不会撤销 `GraphQLNonNull`。
9. 只要有任何解析函数或中间件调用 `useContext<Context>()`，就必须把 `asyncContextProvider` 传给 `weave`；缺少它时 `useContext()` 会抛错。如果没有任何地方调用 `useContext()`，则不要传。
10. 必须把 `fieldAuthorizePlugin` 的每个 `authorize` 检查改写为 `Middleware`。操作使用 `.use(guard)`；对象属性使用 `resolver.of` 中的 `field(...).use(guard).resolve(...)`。加在 query 上的守卫不会保护其返回对象的字段。
11. 必须把 `scalarType`、`asNexusMethod`、`decorateType` 与 `Date` 映射到 `ZodWeaver.config({ presetGraphQLType })`。字符串枚举写成 `z.enum([...]).meta({ title })`；带内部映射值的枚举用 TypeScript `enum` 配合 `z.enum(TsEnum).meta({ title })`。联合成员是带 `__typename` 字面量的 `z.object`，用 `z.discriminatedUnion("__typename", [...]).meta({ title })` 组合。
12. 必须用 `field(...).load(...)` 或 `PrismaResolverFactory.relationField()` 替代 `ctx` / 数据源上的 `DataLoader` 以及 N+1 关联查询。测试中执行时要传入 `contextValue: {}`，否则批处理不会生效。
13. 必须用 `weave(ZodWeaver, config, ...resolvers)` 替代 `makeSchema({ types, plugins, outputs, contextType, sourceTypes })`（仅在规则 9 适用时才加入 `asyncContextProvider`）。没有任何解析器可达的 Silk 不会出现在 SDL 中。
14. 必须采用以下两条明确路径之一迁移 `interfaceType` 与 `t.implements(...)`：(a) 若要原样保留 GraphQL `interface` 与返回接口的字段（`query(Node)`）且保持 SDL `diff` 为空，用 `silk(NodeInterface)` 包装同一个 `GraphQLInterfaceType` 实例，并同时传入 `query(Node)` 与 `asObjectType({ interfaces: [NodeInterface] })`（在各实现类型的 `z.object` 中显式补齐接口字段）；或 (b) 若把接口返回字段改为 `z.discriminatedUnion("__typename", [...])`，需将 `interface` → `union` 作为有意契约变更记录，并把客户端查询调整为内联片段。禁止将同一个 `z.object` Silk 同时传给 `query(Iface)` 与 `asObjectType({ interfaces: [Iface] })`。
15. 必须将 `connectionPlugin`（`t.connectionField`）、`nullabilityGuardPlugin`、`queryComplexityPlugin` 与自定义 Nexus `plugin(...)` 完整迁移为 GQLoom 对应实现（`PageInfo`/`*Edge`/`*Connection` Silk、兜底 `Middleware`、`extensions: { complexity }` 与普通 TypeScript 辅助函数），不要保留任何 Nexus 依赖。
16. 必须完成全部模块的迁移并彻底卸载 `nexus`、`nexus-prisma` 与 `nexus-plugin-prisma`（过渡期不要在同一文件中混用 Nexus 定义与 GQLoom 解析器，迁移完成后不留任何 Nexus 依赖、类型生成文件或配置）。

## 关键迁移实践

### 骨架

安装依赖，并在全部模块迁移完成后删除 Nexus 的 `makeSchema` 入口模块：

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

用打印 Nexus Schema 时相同的方式打印 GQLoom Schema，并在每个模块迁移后比较两个文件：

```ts
import { writeFileSync } from "node:fs"
import { lexicographicSortSchema, printSchema } from "graphql"
import { schema } from "./schema"

writeFileSync("after.graphql", printSchema(lexicographicSortSchema(schema)))
```

### 类型

每个 Nexus `objectType` 对应一个 Zod 对象。用 `.meta({ title })` 命名，用 `.describe()` 或 `.meta({ description })` 添加描述。

```ts
// Nexus
const User = objectType({
  name: "User",
  definition(t) {
    t.id("id")
    t.string("firstName")
  },
})
```

```ts twoslash
import { asField } from "@gqloom/zod"
import { GraphQLID } from "graphql"
import * as z from "zod"

const NullableID = z.string().nullish().register(asField, { type: GraphQLID })

export const User = z
  .object({
    id: NullableID,
    firstName: z.string().nullish(),
  })
  .meta({ title: "User" })
```

可空性以打印出的 SDL 为准。Nexus 既支持默认可空模式（`nonNullDefaults: false`），也支持在全局或单个类型上开启非空默认（`nonNullDefaults: { output: true, input: true }`），请对照打印出的 SDL 进行映射：

| Nexus（默认 `nonNullDefaults: false`） | Nexus（`nonNullDefaults: true`） | SDL | Zod 输出 / 输入 |
| --- | --- | --- | --- |
| `t.string("x")` / `stringArg()` | `t.nullable.string("x")` / `nullable(stringArg())` | `String` | `z.string().nullish()` |
| `t.nonNull.string("x")` / `nonNull(stringArg())` | `t.string("x")` / `stringArg()` | `String!` | `z.string()` |
| `t.list.string("x")` / `list(stringArg())` | `t.nullable.list.nullable.string("x")` | `[String]` | `z.array(z.string().nullish()).nullish()` |
| `t.list.nonNull.string("x")` | `t.nullable.list.string("x")` | `[String!]` | `z.array(z.string()).nullish()` |
| `t.nonNull.list.string("x")` | `t.list.nullable.string("x")` | `[String]!` | `z.array(z.string().nullish())` |
| `t.nonNull.list.nonNull.string("x")` | `t.list.string("x")` | `[String!]!` | `z.array(z.string())` |

之后再收紧可空字段属于有意的 Schema 变更，请在 diff 为空之后再做，不要在移植过程中做。

Nexus 只暴露你在 `definition(t)` 中列出的字段，底层模型字段通过 `sourceTypes` 传入。Zod 对象会暴露全部属性，因此要在 `resolver.of` 中隐藏 Nexus 保持私有的属性（外键、`snake_case` 底层列、密码哈希等）：

```ts
const Comment = z
  .object({
    id: NullableID,
    authorId: z.string(),
    comment: z.string().nullish(),
  })
  .meta({ title: "Comment" })

const commentFields = resolver.of(Comment, {
  authorId: field.hidden, // [!code hl]
})
```

`inputObjectType` 改为独立的 Silk 并使用 `.meta({ title })` 命名。带内部映射值的 `enumType({ name, members: { ... } })` 与联合类型 `unionType` 可直接对应到 `z.enum` 与 `z.discriminatedUnion`：

```ts twoslash
import * as z from "zod"

enum Episode {
  NEWHOPE = 4,
  EMPIRE = 5,
  JEDI = 6,
}

export const EpisodeEnum = z.enum(Episode).meta({ title: "Episode" })

export const CreatePostInput = z
  .object({
    title: z.string(),
    summary: z.string().nullish(),
  })
  .meta({ title: "CreatePostInput" })
```

### 解析器

根字段（`queryType`、`mutationType`、`subscriptionType`、`queryField`、`mutationField`、`subscriptionField`、`extendType({ type: "Query" | "Mutation" })`）放在 `resolver` 中；对象的字段及 `extendType({ type: "User" })` 放在 `resolver.of` 中。参数作为单个对象传给 `.input`。

```ts
// Nexus
export const Query = queryType({
  definition(t) {
    t.field("user", {
      type: "User",
      args: { id: nonNull(idArg()) },
      resolve: (_root, args) => Users.get(args.id),
    })
  },
})

export const UserFields = extendType({
  type: "User",
  definition(t) {
    t.string("fullName", {
      resolve: (user) => `${user.firstName} ${user.lastName}`,
    })
  },
})
```

```ts twoslash
import { field, query, resolver } from "@gqloom/core"
import { asField } from "@gqloom/zod"
import { GraphQLID, GraphQLNonNull } from "graphql"
import * as z from "zod"

const NullableID = z.string().nullish().register(asField, { type: GraphQLID })
const ID = z.string().register(asField, { type: new GraphQLNonNull(GraphQLID) })

const User = z
  .object({
    id: NullableID,
    firstName: z.string().nullish(),
    lastName: z.string().nullish(),
  })
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

Nexus 的 `subscriptionType` / `subscriptionField` 需要把 `subscribe()` 与 `resolve(eventData)` 拆成两段；在 GQLoom 中直接从 `.subscribe(async function* ...)` 产出最终值即可（仅当需要把 PubSub 等事件流载荷转换成返回值时才额外链式调用 `.resolve((payload) => ...)`）：

```ts twoslash
import { resolver, subscription } from "@gqloom/core"
import * as z from "zod"

export const subResolver = resolver({
  countdown: subscription(z.int())
    .input({ from: z.int() })
    .subscribe(async function* ({ from }) {
      for (let i = from; i >= 0; i--) yield i
    }),
})
```

不要把 `resolve` 逻辑写进 `z.object`。若 Nexus 曾对底层字段做重命名（例如 `t.string("homePlanet", { resolve: (o) => o.home_planet })`），在 `resolver.of` 中隐藏 `home_planet: field.hidden` 并定义 `homePlanet` 字段。

### 接口

在 Nexus 中，`interfaceType` 只声明一次公共字段，`t.implements("Node")` 会自动把字段复制到实现它的 `objectType` 上（必要时通过 `t.modify` 覆写），并且查询或字段可以直接返回接口类型（`node(id: ID!): Node`）。

若要原样保持 SDL 且不改动任何客户端查询，只需定义一个 `GraphQLInterfaceType` 实例并用 `silk()` 包装一次，然后把同一个 `GraphQLInterfaceType`（或 Silk）同时传给 `query(Node)` 与 `asObjectType({ interfaces: [NodeInterface] })`。各实现类型的 `z.object` 显式补齐接口字段，原有的 `t.modify` 覆写则改写为 `resolver.of` 中显式的 `field(...).resolve(...)`：

```ts twoslash
import { query, resolver, silk, weave } from "@gqloom/core"
import { ZodWeaver, asField, asObjectType } from "@gqloom/zod"
import { GraphQLID, GraphQLInterfaceType, GraphQLNonNull } from "graphql"
import * as z from "zod"

const ID = z.string().register(asField, { type: new GraphQLNonNull(GraphQLID) })

interface INode {
  id: string
}

const NodeInterface = new GraphQLInterfaceType({
  name: "Node",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  resolveType: (value: { __typename?: string }) => value.__typename,
})

const Node = silk<INode | null | undefined>(NodeInterface)

const Human = z
  .object({
    __typename: z.literal("Human"),
    id: ID,
    name: z.string(),
  })
  // 断言可绕过 Zod v4 registry 的 `$replace` 对 GraphQLInterfaceType 私有成员的裁剪
  .register(asObjectType, { interfaces: [NodeInterface as never] })

const Droid = z
  .object({
    __typename: z.literal("Droid"),
    id: ID,
    primaryFunction: z.string(),
  })
  .register(asObjectType, { interfaces: [NodeInterface as never] })

export const nodeResolver = resolver({
  node: query(Node)
    .input({ id: ID })
    .resolve(({ id }) =>
      id === "1"
        ? { __typename: "Human", id: "1", name: "Luke" }
        : { __typename: "Droid", id: "2", primaryFunction: "Astromech" }
    ),
  human: query(Human).resolve(() => ({
    __typename: "Human",
    id: "1",
    name: "Luke",
  })),
  droid: query(Droid).resolve(() => ({
    __typename: "Droid",
    id: "2",
    primaryFunction: "Astromech",
  })),
})

export const schema = weave(ZodWeaver, nodeResolver)
```

如果你希望全链路只用纯 Zod Schema 而不手写 `GraphQLInterfaceType`，并且可以调整接口返回字段的契约，可将该字段返回类型改为 `z.discriminatedUnion("__typename", [Human, Droid]).meta({ title: "Character" })`，不要直接返回接口 Silk。**SDL 变化与客户端适配方式**：`interface Character` 会变为 `union Character = Droid | Human`；客户端不能再在根选择集上直接选取公共字段（`hero { id name }`），需要改写为内联片段（`hero { ... on Human { id name } ... on Droid { id name } }`）。

### Relay 分页连接

Nexus 的 `connectionPlugin`（`t.connectionField`）会生成 `PageInfo`、`<Name>Edge`、`<Name>Connection` 类型以及前后游标参数（`first`、`after`、`last`、`before`）。在 GQLoom 中可以用可复用的 `connectionSilks` 辅助函数配合标准游标分页（例如 `graphql-relay` 的 `connectionFromArray` 或数据库游标查询）完整迁移：

```ts twoslash
import { query, resolver, weave } from "@gqloom/core"
import { ZodWeaver, asField } from "@gqloom/zod"
import { GraphQLID, GraphQLNonNull } from "graphql"
import * as z from "zod"

const ID = z.string().register(asField, { type: new GraphQLNonNull(GraphQLID) })

const PageInfo = z
  .object({
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
    startCursor: z.string().nullish(),
    endCursor: z.string().nullish(),
  })
  .meta({ title: "PageInfo" })

function connectionSilks<TNode extends z.ZodTypeAny>(
  prefix: string,
  nodeSilk: TNode
) {
  const Edge = z
    .object({
      cursor: z.string(),
      node: nodeSilk.nullish(),
    })
    .meta({ title: `${prefix}Edge` })

  const Connection = z
    .object({
      edges: z.array(Edge.nullish()).nullish(),
      pageInfo: PageInfo,
    })
    .meta({ title: `${prefix}Connection` })

  return { Edge, Connection }
}

const User = z.object({ id: ID, name: z.string() }).meta({ title: "User" })
const { Connection: UserConnection } = connectionSilks("User", User)

export const usersResolver = resolver({
  users: query(UserConnection.nullish())
    .input({
      first: z.int().nullish(),
      after: z.string().nullish(),
      last: z.int().nullish(),
      before: z.string().nullish(),
      activeOnly: z.boolean().nullish(),
    })
    .resolve(() => ({
      edges: [{ cursor: "Y3Vyc29yOjA=", node: { id: "1", name: "Ada" } }],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: "Y3Vyc29yOjA=",
        endCursor: "Y3Vyc29yOjA=",
      },
    })),
})

export const schema = weave(ZodWeaver, usersResolver)
```

保持各项 Nexus 连接配置一致及处理 SDL 差异的方法：

- `includeNodesField: true`：在 `Connection` 中增加 `nodes: z.array(nodeSilk.nullish()).nullish()`。
- `extendConnection` / `extendEdge`：直接把扩展字段写入 `Connection` / `Edge` 的 Silk，或通过 `resolver.of(Connection, { ... })` 添加计算字段。
- `disableForwardPagination` / `disableBackwardPagination`：在 `.input({ ... })` 中省略 `first` / `after` 或 `last` / `before`，使参数列表与原 SDL 一致。
- **字段级连接类型名的 SDL 变化与客户端适配**：若原 Nexus 中对单个字段使用了 `extendConnection` 或 `extendEdge`，Nexus 会生成带字段前缀的类型名（如 `QueryUsers_Connection` 与 `QueryUsers_Edge`）。可以给 `connectionSilks` 传入 `"QueryUsers_"` 前缀以保持 SDL 完全一致，也可以统一规范为 `UserConnection` / `UserEdge`，并同步更新引用了 `QueryUsers_Connection` 的客户端 GraphQL Fragment 或代码生成类型。

### 鉴权与上下文

Nexus 从每个解析函数的第三个参数读取上下文，并在 `makeSchema` 中通过 `contextType` 配置静态类型。GQLoom 通过 `useContext<Ctx>()` 读取上下文，无需 `contextType` 或 `typegen` 即可直接推导类型，服务端的创建方式相同。

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

`fieldAuthorizePlugin` 的每个 `authorize` 都变成一个中间件：

```ts
// Nexus (fieldAuthorizePlugin)
queryType({
  definition(t) {
    t.string("message", {
      authorize: (_root, _args, ctx) => ctx.user != null,
      resolve: () => "hi",
    })
  },
})

objectType({
  name: "Article",
  definition(t) {
    t.nonNull.id("id")
    t.nonNull.string("internalNotes", {
      authorize: (_root, _args, ctx) => Boolean(ctx.user?.employee),
    })
  },
})
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

如果 Nexus 在 `objectType` 的字段上定义了 `authorize`，请移到 `resolver.of` 的 `field(...).use(guard)` 上；只存在于 Silk 上的属性不会执行任何中间件。

### 空值守卫与自定义插件

`nullabilityGuardPlugin` 会在非空字段意外返回 `null` 时按 GraphQL 类型返回兜底值，避免错误冒泡。在 GQLoom 中可以写成一个传入 `weave` 的全局 `Middleware`，在保持 SDL 不变的同时实现完全相同的运行时兜底：

```ts twoslash
import { type Middleware, query, resolver, weave } from "@gqloom/core"
import { ZodWeaver } from "@gqloom/zod"
import { getNamedType, isNonNullType } from "graphql"
import * as z from "zod"

const fallbacks: Record<string, () => unknown> = {
  String: () => "",
  ID: () => "MISSING_ID",
  Boolean: () => true,
}

const nullabilityGuard: Middleware = async (opts) => {
  const result = await opts.next()
  if (result != null) return result
  const returnType = opts.payload?.info.returnType
  if (returnType && isNonNullType(returnType)) {
    const named = getNamedType(returnType).name
    if (named in fallbacks) return fallbacks[named]()
  }
  return result
}

const demoResolver = resolver({
  greeting: query(z.string()).resolve(() => null as unknown as string),
})

export const schema = weave(ZodWeaver, nullabilityGuard, demoResolver)
```

其余 Nexus 插件模式也可以直接迁移，无需插件机制：

- `queryComplexityPlugin`（`complexity`）：在 Silk 字段上使用 `asField({ extensions: { complexity: 2 } })`，或在操作上使用 `.extensions({ complexity: ({ args, childComplexity }) => ... })`，并在服务端保留 `graphql-query-complexity` 校验规则（参见仓库示例 `examples/query-complexity`）。
- 自定义 `onCreateFieldResolver` 插件（日志、耗时统计、异常上报）：改写为 `Middleware`，通过 `.use(...)` 或传入 `weave(...)` 全局生效。
- 自定义 `onObjectDefinition` / `dynamicOutputMethod` / `dynamicInputMethod` 扩展（如统一的 `createdAt` / `updatedAt` 字段）：直接导出普通 TypeScript 字段对象（`const timestamps = { createdAt: z.date(), updatedAt: z.date() }`）展开进 `z.object({ ...timestamps, ... })`，或封装普通的解析器工厂辅助函数。

### Prisma 插件

`nexus-plugin-prisma`（`t.model.*`、`t.crud.*`）与 `nexus-prisma`（`generator nexusPrisma`、`t.field(User.id)`）都负责把 Prisma 模型映射进 Nexus 的 `objectType`。在 GQLoom 中，Prisma 生成器会直接产出 Silk：无需投影 `objectType`，无需配置 `sourceTypes`，也无需挂载 `nexusPrisma()` 插件。把 `nexusPrisma` 生成器替换为 GQLoom 生成器并运行 `npx prisma generate`：

```prisma
generator gqloom {
  provider = "prisma-gqloom"
}
```

```ts
// Nexus (nexus-prisma)
import { User } from "nexus-prisma"
import { objectType, queryType, nonNull, intArg } from "nexus"

const UserType = objectType({
  name: User.$name,
  definition(t) {
    t.field(User.id)
    t.field(User.email)
    t.field(User.posts)
  },
})

const Query = queryType({
  definition(t) {
    t.field("user", {
      type: "User",
      args: { id: nonNull(intArg()) },
      resolve: (_root, { id }, ctx) => ctx.prisma.user.findUnique({ where: { id } }),
    })
  },
})
```

```ts
// GQLoom
import { field, query, resolver, weave } from "@gqloom/core"
import { asyncContextProvider } from "@gqloom/core/context"
import { PrismaResolverFactory } from "@gqloom/prisma"
import { useSelectedFields } from "@gqloom/prisma/context"
import { ZodWeaver } from "@gqloom/zod"
import * as z from "zod"
import { Post, User } from "./generated/gqloom"
import { prisma } from "./prisma"

const userFactory = new PrismaResolverFactory(User, prisma)

const userResolver = resolver.of(User, {
  user: query(User.nullish())
    .input({ id: z.int() })
    .resolve(({ id }) =>
      prisma.user.findUnique({
        select: useSelectedFields(User),
        where: { id },
      })
    ),
  posts: userFactory.relationField("posts"),
  password: field.hidden,
})

export const schema = weave(ZodWeaver, asyncContextProvider, userResolver)
```

用 `field.hidden` 隐藏列（例如 `password: field.hidden`），而不是靠“不在 `definition(t)` 列表里”。`@gqloom/prisma` 默认将 `@id` 字段输出为 `ID`；若原 Nexus Schema 将 `@id` 暴露为 `Int` 或 `String`，可通过 `PrismaWeaver.config({ emitIdAsIDType: false })` 保持一致。

迁移 `nexus-plugin-prisma` 的 `t.crud.*` 与 `computedInputs`：

- 在 `resolver.of(User, { ... })` 中使用原有的字段名键名绑定 `userFactory.findUniqueQuery()`、`findManyQuery()` 与 `createMutation()`（如 `user`、`users`、`createOneUser`），即可保留根操作名称（参见 [Prisma](../schema/prisma.md#解析器工厂)）。
- 原先的 `computedInputs` 改用 `.use(async ({ parseInput, next }) => ...)` 中间件或 `.input(...).transform(...)`，在服务端注入由 `useContext()` 推导的字段（如 `authorId`），不暴露给 GraphQL 输入类型。
- **SDL 变化与客户端适配**：`nexus-plugin-prisma` 的 `t.crud.*` 会生成独有的过滤、排序与嵌套写入输入类型（如 `UserOrderByInput`、`UserFilter`、`users` 与关联字段上的 `after`/`before`/`first`/`last` 游标参数、`CreateManyWithout...Input`），而 `PrismaResolverFactory` 生成的是 Prisma DMMF 原生输入类型（如 `orderBy: [UserOrderByWithRelationInput!]`、`skip`/`take`/`cursor` 分页、`*CreateNested*Input`），且 `relationField()` 默认不带游标参数。迁移时要么在切换期将客户端查询和代码生成类型升级为 `PrismaResolverFactory` 契约，要么在 `findManyQuery().input(...)` / `createMutation().input(...)` 上传入自定义的 `.input(LegacyInputSilk.transform(...))` 适配器（并对带分页参数的关联字段改用 `field(...).input(...).load(...)`），从而在不改客户端的前提下彻底移除 `nexus-plugin-prisma`。

### N+1

Nexus 项目通常把 `DataLoader` 实例挂在 `ctx` 或请求级数据源上。在 GQLoom 中，把 `.load()` 直接加在字段上。加载函数一次接收同一时刻的所有 `parent`，并且必须按相同顺序为每个 `parent` 返回一个结果。

```ts
// Nexus
objectType({
  name: "Post",
  definition(t) {
    t.id("id")
    t.field("author", {
      type: "User",
      resolve: (post, _args, ctx) => ctx.loaders.userById.load(post.authorId),
    })
  },
})
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

批处理以请求上下文对象为键。Yoga 等服务端总会提供上下文对象；在单元测试中调用 `graphql()` 时请传入 `contextValue: {}`，否则批处理不会生效。

## 陷阱

每一项都给出实际观察到的错误结果与修正方式。

- 可空性：Nexus 的 `nonNullDefaults` 默认为 `{ output: false, input: false }`，因此 `t.string("title")` 输出 `title: String`。写成 `title: z.string()` 会输出 `String!`，改变错误传播方式；写成 `z.string().nullable()` 虽然输出 `String`，但当解析函数返回 `undefined` 时无法通过类型检查：`Type 'IUser | undefined' is not assignable to type 'MayPromise<... | null>'`。

  ```ts
  const Post = z.object({ title: z.string() }).meta({ title: "Post" }) // [!code --]
  const Post = z.object({ title: z.string().nullish() }).meta({ title: "Post" }) // [!code ++]
  ```

- 列表与元素的可空性（`t.list.string` 与 `[String]`）：在 Nexus 默认的 `nonNullDefaults: false` 下，`t.list.string("tags")` 输出 `[String]`（列表可空、元素也可空）。写成 `z.array(z.string()).nullish()` 会输出 `[String!]`；需要在元素与数组两层都加上 `.nullish()`：

  ```ts
  tags: z.array(z.string()).nullish() // 输出 [String!] // [!code --]
  tags: z.array(z.string().nullish()).nullish() // 输出 [String] // [!code ++]
  ```

- 所有属性都会被暴露：Nexus 只暴露在 `definition(t)` 中声明过的字段。Zod 对象会暴露全部属性，缺少 `field.hidden` 时，外键或 `sourceTypes` 内部字段会泄漏到 SDL 中：

  ```ts
  const commentFields = resolver.of(Comment, {
    authorId: field.hidden, // [!code ++]
    postId: field.hidden, // [!code ++]
    author: field(User.nullish()).resolve((comment) => Users.get(comment.authorId)),
  })
  ```

- ID 标量：`z.string()` 输出 `String`。`asField({ type })` 会替换 GraphQL 类型并丢失 `!`，而在 `asField` 之后再调用 `ID.nullish()` 仍然输出 `ID!`。使用规则 8 的辅助常量，并按 SDL 选择：

  ```ts
  const id = z.string() // 输出 String // [!code --]
  const ID = z.string().register(asField, { type: new GraphQLNonNull(GraphQLID) }) // ID! // [!code ++]
  const NullableID = z.string().nullish().register(asField, { type: GraphQLID }) // ID // [!code ++]
  ```

- 日期：`z.date()` 输出 `String`。用 `ZodWeaver.config({ presetGraphQLType })` 注册一次标量（使用原 Nexus Schema 中的标量名，如 `DateTime` 或 `Date`），并把配置传给 `weave`。

- 输入类型与对象类型是不同的类型。同一个 Silk 同时用于两者，会在 `weave` 时失败：`Schema must contain uniquely named types but contains multiple types named "P"`。

  ```ts
  mk: mutation(P).input({ p: P }) // [!code --]
  mk: mutation(P).input({ p: PInput }) // [!code ++]
  ```

- 没有 `asyncContextProvider` 时调用 `useContext()`，第一个调用它的解析函数会抛出 `Cannot read properties of undefined`：

  ```ts
  weave(ZodWeaver, rootResolver) // [!code --]
  weave(ZodWeaver, asyncContextProvider, rootResolver) // [!code ++]
  ```

- 加在操作上的中间件只保护该操作。返回对象的属性除非在 `resolver.of` 中声明为字段，否则不会执行任何中间件，因此无法阻止同一属性通过其他 query 或关联字段被访问。请把 Nexus 对象字段上的 `authorize` 移到 `resolver.of` 的 `field().use(...)` 上：

  ```ts
  const secretFields = resolver.of(Sec, {
    secret: field(z.string()).use(adminOnly).resolve((sec) => sec.secret), // [!code ++]
  })
  ```

  同时注意：`fieldAuthorizePlugin` 默认抛出 `new Error("Not authorized")`（`defaultFormatError`），如果中间件抛出 `GraphQLError` 或自定义错误格式，需同步检查测试断言。

- 接口类型字段与 `t.implements`：如果把同一个 `z.object` Silk 同时传给 `query(Node)` 与 `asObjectType({ interfaces: [Node] })`，会失败并报 `Schema must contain uniquely named types but contains multiple types named "Node"`。应当改用 `silk(NodeInterface)` 共享同一个 `GraphQLInterfaceType`（保持 SDL 不变），或将返回接口的字段改为 `z.discriminatedUnion("__typename", [...])` 并把客户端查询调整为内联片段（见[接口](#接口)）。此外，与 Nexus 的 `t.implements(...)` 不同，各实现类型的 `z.object` 必须显式写出接口字段。

- 参数 `default` 在 SDL 中的表现与显式 `null`：Nexus 的 `stringArg({ default: "World" })` 在 SDL 中输出 `String = "World"`，并在客户端显式传入 `null` 时把 `null` 传给解析函数。在 GQLoom 中，`z.string().nullish().default("World")` 不会在 SDL 中输出 `= "World"`，但同样会在未传参时填充默认值、在显式传入 `null` 时透传 `null`。若测试或客户端代码生成依赖 SDL 文本中的 `= "World"`，需同步更新相应断言。

- `.optional()` 输入会拒绝显式的 `null`：`z.int().optional()` 输出 `Int`，但 `{ posts(take: null) }` 会失败并报 `Invalid input: expected number, received null`，而 Nexus 的 `intArg()` 接受 `null`。每个可选的 Nexus 参数与输入字段都应使用 `.nullish()`：

  ```ts
  .input({ take: z.int().optional() }) // [!code --]
  .input({ take: z.int().nullish() }) // [!code ++]
  ```

- 输入校验错误：Nexus 除了 GraphQL 标量与输入对象类型检查外，默认不执行额外的 Schema 校验。GQLoom 会在 `resolve` 之前按 Zod 规则校验参数，校验失败时会拒绝请求并返回 `extensions.issues`。

## 验证

迁移的目标是契约不变、行为不变（若主动采用了需适配客户端的契约变更，则按记录后的契约核对）。

1. 在改动之前，打印 Nexus 的 SDL（不要直接用 Nexus 自动写入的 `outputs.schema` 文件做文本对比，因为其中的横幅注释与未按字母排序的类型顺序会带来大量噪声 diff）：

   ```ts
   import { writeFileSync } from "node:fs"
   import { lexicographicSortSchema, printSchema } from "graphql"
   import { schema } from "./schema"

   writeFileSync("before.graphql", printSchema(lexicographicSortSchema(schema)))
   ```

2. 每迁移一个模块，用相同的调用打印 GQLoom 的 SDL（见[骨架](#骨架)）并比较：

   ```sh
   diff before.graphql after.graphql
   ```

   除非是有意选择并已记录的契约调整（例如把返回接口的字段改为联合类型，或把 `t.crud.*` 切换为 Prisma DMMF 输入类型），否则输出必须为空。应当修改 Schema，而不是修改文件。

3. 对两份 Schema 重放请求并比较 JSON：

   ```ts twoslash
   import { query, resolver, weave } from "@gqloom/core"
   import { ZodWeaver } from "@gqloom/zod"
   import { graphql } from "graphql"
   import * as z from "zod"

   const helloResolver = resolver({
     hello: query(z.string())
       .input({ name: z.string().nullish() })
       .resolve(({ name }) => `Hello, ${name ?? "World"}`),
   })
   const schema = weave(ZodWeaver, helloResolver)

   const result = await graphql({
     schema,
     source: `{ hello(name: "Nexus") }`,
     contextValue: {},
   })
   console.log(JSON.stringify(result))
   // {"data":{"hello":"Hello, Nexus"}}
   ```

   请重放客户端真实发送的 query、mutation 与 subscription，并包含一条缺少必填参数的请求，确保 GraphQL 校验错误文本也一致。鉴权错误或新引入的 Zod 校验错误在 `extensions` 上会有差异（见[陷阱](#陷阱)）；请有意识地更新断言。

## 参考实现

下面移植 Nexus 官方 [Getting Started 教程](https://github.com/graphql-nexus/nexus/blob/main/docs/content/010-getting-started/03-tutorial/04-chapter-3-adding-mutations-to-your-api.mdx) 中的内存博客 API（`db.ts` + `Post.ts` + `schema.ts`）。`db.ts` 保持不变（保留 `Post`、`Db` 接口与初始数据），`nexus-typegen.ts` 被删除，`server.ts` 仅在 `schema` 导出路径变化时修改导入。

由于 Nexus 默认的 `nonNullDefaults: false`，`Post` 上的字段全部为可空（`Int`、`String`、`Boolean`），且 `t.list.field("drafts", { type: "Post" })` 输出为 `[Post]`（列表与元素都可空）。移植严格对齐 `nexus` 实际打印的 SDL：

```graphql
type Mutation {
  createDraft(body: String!, title: String!): Post!
  publish(draftId: Int!): Post
}

type Post {
  body: String
  id: Int
  published: Boolean
  title: String
}

type Query {
  drafts: [Post]
  posts: [Post]
}
```

::: code-group

```ts twoslash [GQLoom]
// @filename: db.ts
export interface Post {
  id: number
  title: string
  body: string
  published: boolean
}

export interface Db {
  posts: Post[]
}

export const db: Db = {
  posts: [{ id: 1, title: "Nexus", body: "...", published: false }],
}
// @filename: context.ts
import type { Db } from "./db"

export interface Context {
  db: Db
}
// @filename: schema.ts
// ---cut---
import { mutation, query, resolver, weave } from "@gqloom/core"
import { asyncContextProvider, useContext } from "@gqloom/core/context"
import { ZodWeaver } from "@gqloom/zod"
import * as z from "zod"
import type { Context } from "./context"
import type { Post as DbPost } from "./db"

const Post = z
  .object({
    id: z.int().nullish(),
    title: z.string().nullish(),
    body: z.string().nullish(),
    published: z.boolean().nullish(),
  })
  .meta({ title: "Post" })

export const postResolver = resolver({
  drafts: query(z.array(Post.nullish()).nullish()).resolve(() =>
    useContext<Context>().db.posts.filter((p) => p.published === false)
  ),
  posts: query(z.array(Post.nullish()).nullish()).resolve(() =>
    useContext<Context>().db.posts.filter((p) => p.published === true)
  ),
  createDraft: mutation(Post)
    .input({ title: z.string(), body: z.string() })
    .resolve(({ title, body }) => {
      const db = useContext<Context>().db
      const draft: DbPost = {
        id: db.posts.length + 1,
        title,
        body,
        published: false,
      }
      db.posts.push(draft)
      return draft
    }),
  publish: mutation(Post.nullish())
    .input({ draftId: z.int() })
    .resolve(({ draftId }) => {
      const draftToPublish = useContext<Context>().db.posts.find(
        (p) => p.id === draftId
      )
      if (!draftToPublish) {
        throw new Error("Could not find draft with id " + draftId)
      }
      draftToPublish.published = true
      return draftToPublish
    }),
})

export const schema = weave(ZodWeaver, asyncContextProvider, postResolver)
```

```ts [Nexus]
// api/graphql/Post.ts
import { extendType, intArg, nonNull, objectType, stringArg } from "nexus"

export const Post = objectType({
  name: "Post",
  definition(t) {
    t.int("id")
    t.string("title")
    t.string("body")
    t.boolean("published")
  },
})

export const PostQuery = extendType({
  type: "Query",
  definition(t) {
    t.list.field("drafts", {
      type: "Post",
      resolve(_root, _args, ctx) {
        return ctx.db.posts.filter((p) => p.published === false)
      },
    })
    t.list.field("posts", {
      type: "Post",
      resolve(_root, _args, ctx) {
        return ctx.db.posts.filter((p) => p.published === true)
      },
    })
  },
})

export const PostMutation = extendType({
  type: "Mutation",
  definition(t) {
    t.nonNull.field("createDraft", {
      type: "Post",
      args: {
        title: nonNull(stringArg()),
        body: nonNull(stringArg()),
      },
      resolve(_root, args, ctx) {
        const draft = {
          id: ctx.db.posts.length + 1,
          title: args.title,
          body: args.body,
          published: false,
        }
        ctx.db.posts.push(draft)
        return draft
      },
    })
    t.field("publish", {
      type: "Post",
      args: {
        draftId: nonNull(intArg()),
      },
      resolve(_root, args, ctx) {
        const draftToPublish = ctx.db.posts.find(
          (p) => p.id === args.draftId
        )
        if (!draftToPublish) {
          throw new Error("Could not find draft with id " + args.draftId)
        }
        draftToPublish.published = true
        return draftToPublish
      },
    })
  },
})

// api/schema.ts
import { join } from "node:path"
import { makeSchema } from "nexus"
import * as types from "./graphql"

export const schema = makeSchema({
  types,
  outputs: {
    typegen: join(__dirname, "..", "nexus-typegen.ts"),
    schema: join(__dirname, "..", "schema.graphql"),
  },
  contextType: {
    module: join(__dirname, "./context.ts"),
    export: "Context",
  },
})
```

:::

需要了解的差异：

- Nexus 通过文件路径配置 `contextType`，并在启动时生成 `nexus-typegen.ts` 与 `schema.graphql`。GQLoom 只需在 `weave` 中传入 `asyncContextProvider`，由 TypeScript 直接推导 `useContext<Context>()`。
- Nexus 中的 `PostQuery` 与 `PostMutation` 通过 `extendType({ type: "Query" | "Mutation" })` 挂载到根类型；在 GQLoom 中统一收口在 `resolver({ ... })` 内。
- `t.list.field("drafts", { type: "Post" })` 输出 `[Post]`（列表与元素均为空值安全），对应 `z.array(Post.nullish()).nullish()`；而 `t.nonNull.field("createDraft", { type: "Post" })` 输出 `Post!`，对应 `mutation(Post)`。

本次移植的验证：`printSchema(lexicographicSortSchema(schema))` 的 `diff` 为空；使用相同的初始 `db` 数据，重放 `{ drafts { id title body published } }`、`mutation { createDraft(title: "GQLoom", body: "Weave") { id title body published } }`、`mutation { publish(draftId: 2) { id title body published } }`、`{ posts { id title body published } }` 以及 `mutation { createDraft(title: "MissingBody") { id } }`（缺少必填参数），两份 Schema 返回完全相同的 JSON。

## 清理

所有模块都通过 SDL diff 与请求重放之后：

1. 卸载 Nexus 相关包（只卸载实际安装的）：

   ```sh
   npm uninstall nexus nexus-prisma nexus-plugin-prisma
   ```

   保留 `graphql`。使用 `pnpm remove`、`yarn remove` 或 `bun remove` 执行等价操作。

2. 删除残留的生成文件与配置：

   - 删除 `makeSchema` 的 `outputs` 配置所生成的 `typegen` 与 `schema` 产物文件（例如 `nexus-typegen.ts`、`src/generated/nexus.ts`、`node_modules/@types/nexus-typegen/`、`node_modules/@types/typegen-nexus/`，以及仅属于 Nexus 的 `schema.graphql`）。
   - 在 `prisma/schema.prisma` 中删除 `generator nexusPrisma { provider = "nexus-prisma" ... }`，删除 `nexus-prisma.ts` / `nexusPrisma.ts` 配置文件及其输出目录，然后运行 `npx prisma generate`。
   - 删除 `makeSchema` 配置（`sourceTypes`、`contextType`、`outputs`、`shouldGenerateArtifacts`、`nonNullDefaults`）、`/// <reference path="...typegen.ts" />` 注释以及所有 `NexusGen*` 全局类型引用。
   - 更新 `package.json` 脚本，移除构建或测试前执行 `api/schema` 生成产物的命令以及 `--ignore-watch` 监听忽略参数。
   - 重写示例或包的 `README.md`，使现行文档不再描述 Nexus API：把标题和包列表中的 `nexus` 改为 `@gqloom/core`、`@gqloom/zod`、`zod`，并把其中内嵌的 SDL 替换为 `printSchema(lexicographicSortSchema(schema))` 的输出。
   - 如果复制了整个 Nexus 示例目录，删除其历史 `CHANGELOG.md` 或在下方检查中排除。
   - 最后一次比较之后删除 `before.graphql`，或将其保留为契约测试。

3. 检查是否还有残留。请在仓库根目录执行，以便搜索到 `README.md` 与配置文件，而不只是 `src/`。只排除 `node_modules`、锁文件与 `CHANGELOG.md`（历史变更日志可能仍提到 Nexus）：

   ```sh
   rg -n -i "nexus-prisma|nexus-plugin-prisma|nexus-typegen|NexusGen|makeSchema|objectType|inputObjectType|fieldAuthorizePlugin|nexus" . \
     -g '!node_modules' -g '!CHANGELOG.md' \
     -g '!pnpm-lock.yaml' -g '!package-lock.json' -g '!yarn.lock' -g '!bun.lock'
   ```

   该命令必须没有任何输出。`README.md` 或 `package.json` 中出现任何匹配都说明第 2 步还没有完成。

相关文档：

- [Zod](../schema/zod.md)：`.meta()`、`.describe()`、枚举、联合、接口、`asObjectType` / `asField`
- [解析器](../resolver.md)：`resolver.of`、`query`、`mutation`、`subscription`、`field`
- [中间件](../middleware.md)：鉴权与全局中间件
- [上下文](../context.md)：`useContext` 与 `asyncContextProvider`
- [数据加载器](../dataloader.md)：`field().load()`
- [Prisma](../schema/prisma.md) 与 [Drizzle](../schema/drizzle.md)：Silk 与解析器工厂
