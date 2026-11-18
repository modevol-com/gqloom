# 从 Pothos 迁移到 GQLoom

## 为什么迁到 GQLoom

Pothos 通过 `SchemaBuilder` 实例构建 GraphQL Schema：每个类型都要在 builder 上声明（`objectRef` + `implement`、`t.exposeX('field')`），并把底层 TypeScript 类型作为泛型传给 builder。GQLoom 直接将运行时 Schema（如 Zod、Valibot、Yup）或 ORM 模型（如 Prisma、Drizzle、MikroORM）编织为 GraphQL Schema，不需要 builder 实例。

下表数据来自把 Pothos 官方 [`examples/simple-interfaces`](https://github.com/hayes/pothos/tree/main/examples/simple-interfaces)（`@pothos/core` 4.18.0，`graphql` 16.14.2）移植到 GQLoom 的实测结果。完整移植见[参考实现](#参考实现)。

| 同一示例的实测对比 | Pothos | GQLoom（Zod） |
| --- | --- | --- |
| Schema 代码文件 | `builder.ts` + `schema.ts`，共 96 行 | `schema.ts`，90 行（含两个 ID 辅助常量） |
| `SchemaBuilder` 实例及其泛型 | 1 | 0 |
| `objectRef` + `.implement(...)` | 3 + 3 | 0 |
| `builder.queryType(...)` 与以字符串为键的 `t.expose*('name')` 声明 | 1 与 8 | 0（字段即 `z.object` 的属性） |
| 声明 `Post` 形状的位置 | 3（底层接口、`objectRef<IPost>`、`t.expose*` 列表） | 1（`z.object`；`z.infer` 给出 TypeScript 类型） |
| `printSchema(lexicographicSortSchema(schema))` 迁移前后对比 | 不适用 | `diff` 为空 |
| 重放 4 条请求（3 条数据查询、1 条校验错误） | 不适用 | JSON 完全一致，包括错误文本 |
| `package.json` 中的运行时依赖 | `@pothos/core` | `@gqloom/core`、`@gqloom/zod`、`zod` |

移植保留了 `data.ts` 中的 `IPost` 接口，这样 `data.ts` 无需改动；改用 `z.infer<typeof Post>` 并删除接口是可选的。

这张表没有声称的事情：在这么小的 Schema 上，移植后的代码并没有明显更短，并且多了 `zod` 依赖。收益体现在移除插件之后。完整迁移后可以卸载 `@pothos/core` 与所有 `@pothos/plugin-*` 包，去掉 `PrismaTypes` 泛型与 `prisma-pothos-types` 生成器，也不再需要在 Prisma Schema 或 Drizzle 表旁边再维护一份模型声明。

- 一份运行时 Schema 或 ORM 模型作为唯一事实源。TypeScript 类型由其推导，GraphQL 类型由其编织，输入校验由 Schema 自身完成（不再需要 `@pothos/plugin-zod` 或 `@pothos/plugin-validation`）。
- Prisma、Drizzle、MikroORM 模型可直接作为丝线（Silk）使用，解析器工厂生成 CRUD 操作与关联字段。
- `field().load()` 批量加载关联数据，替代 `@pothos/plugin-dataloader`，无需 `loadableObject` 声明。
- 中间件与 `useContext()` 替代 `@pothos/plugin-scope-auth` 以及每个解析函数的 `context` 参数。

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

## 核心概念与映射表

下面的 builder 设置了 `defaultFieldNullability: false`，所以未标注的 Pothos 字段为非空，与 Zod 一致。其后的代码块是同一份 Schema 的 GQLoom 版本。两边构建结果的 `printSchema(lexicographicSortSchema(schema))` 用 `diff` 比较过：完全一致（59 行 SDL）。

::: code-group

```ts [Pothos]
import SchemaBuilder from "@pothos/core"
import { GraphQLDateTime } from "graphql-scalars"

interface Ctx {
  user?: { id: string; role: "USER" | "ADMIN" }
}

const builder = new SchemaBuilder<{
  Context: Ctx
  DefaultFieldNullability: false
  Scalars: { DateTime: { Input: Date; Output: Date } }
}>({ defaultFieldNullability: false })

builder.addScalarType("DateTime", GraphQLDateTime)

const Role = builder.enumType("Role", { values: ["USER", "ADMIN"] as const })

const PostInput = builder.inputType("PostInput", {
  fields: (t) => ({
    title: t.string({ required: true }),
    tags: t.stringList(),
    role: t.field({ type: Role }),
  }),
})

interface IPost {
  id: string
  title: string
  views: number
  createdAt: Date
}

const Post = builder.objectRef<IPost>("Post").implement({
  description: "A post",
  fields: (t) => ({
    id: t.exposeID("id"),
    title: t.exposeString("title", { description: "The title" }),
    views: t.exposeInt("views"),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
    summary: t.string({
      nullable: true,
      deprecationReason: "Use title",
      resolve: (post) => post.title,
    }),
    shout: t.string({
      args: { times: t.arg.int({ required: true }) },
      resolve: (post, { times }) => post.title.repeat(times),
    }),
    tags: t.stringList({ resolve: () => [] }),
    maybeTags: t.field({
      type: ["String"],
      nullable: { list: true, items: true },
      resolve: () => null,
    }),
  }),
})

const Node = builder.interfaceRef<{ id: string }>("Node").implement({
  fields: (t) => ({ id: t.exposeID("id") }),
})
const Dog = builder.objectRef<{ id: string; name: string }>("Dog").implement({
  interfaces: [Node],
  isTypeOf: () => true,
  fields: (t) => ({ name: t.exposeString("name") }),
})
const Cat = builder.objectRef<{ id: string; lives: number }>("Cat").implement({
  interfaces: [Node],
  isTypeOf: () => false,
  fields: (t) => ({ lives: t.exposeInt("lives") }),
})
const Animal = builder.unionType("Animal", {
  types: [Dog, Cat],
  resolveType: (animal) => ("lives" in animal ? Cat : Dog),
})

builder.queryType({
  fields: (t) => ({
    post: t.field({
      type: Post,
      nullable: true,
      args: { id: t.arg.id({ required: true }) },
      resolve: () => null,
    }),
    animals: t.field({ type: [Animal], resolve: () => [] }),
    me: t.string({ nullable: true, resolve: (_root, _args, ctx) => ctx.user?.id }),
  }),
})

builder.mutationType({
  fields: (t) => ({
    createPost: t.field({
      type: Post,
      args: { input: t.arg({ type: PostInput, required: true }) },
      resolve: (_root, { input }) => ({
        id: "1",
        title: input.title,
        views: 0,
        createdAt: new Date(),
      }),
    }),
  }),
})

builder.subscriptionType({
  fields: (t) => ({
    countdown: t.int({
      args: { from: t.arg.int({ required: true }) },
      subscribe: async function* (_root, { from }) {
        for (let i = from; i >= 0; i--) yield i
      },
      resolve: (n) => n as number,
    }),
  }),
})

export const schema = builder.toSchema()
```

```ts twoslash [GQLoom]
import {
  field,
  mutation,
  query,
  resolver,
  subscription,
  weave,
} from "@gqloom/core"
import { asyncContextProvider, useContext } from "@gqloom/core/context"
import { ZodWeaver, asField, asObjectType } from "@gqloom/zod"
import { GraphQLID, GraphQLNonNull } from "graphql"
import { GraphQLDateTime } from "graphql-scalars"
import * as z from "zod"

interface Ctx {
  user?: { id: string; role: "USER" | "ADMIN" }
}

const ID = z.string().register(asField, { type: new GraphQLNonNull(GraphQLID) })

const zodWeaverConfig = ZodWeaver.config({
  presetGraphQLType: (schema) => {
    if (schema instanceof z.ZodDate) return GraphQLDateTime
  },
})

const Role = z.enum(["USER", "ADMIN"]).meta({ title: "Role" })

const PostInput = z
  .object({
    title: z.string(),
    tags: z.array(z.string()).nullish(),
    role: Role.nullish(),
  })
  .meta({ title: "PostInput" })

const Post = z
  .object({
    id: ID,
    title: z.string().describe("The title"),
    views: z.int(),
    createdAt: z.date(),
  })
  .meta({ title: "Post", description: "A post" })

const postFields = resolver.of(Post, {
  summary: field(z.string().nullish())
    .deprecationReason("Use title")
    .resolve((post) => post.title),
  shout: field(z.string())
    .input({ times: z.int() })
    .resolve((post, { times }) => post.title.repeat(times)),
  tags: field(z.array(z.string())).resolve(() => []),
  maybeTags: field(z.array(z.string().nullish()).nullish()).resolve(
    () => null
  ),
})

const Node = z.object({ __typename: z.literal("Node").nullish(), id: ID })
const Dog = z
  .object({ __typename: z.literal("Dog"), id: ID, name: z.string() })
  .register(asObjectType, { interfaces: [Node] })
const Cat = z
  .object({ __typename: z.literal("Cat"), id: ID, lives: z.int() })
  .register(asObjectType, { interfaces: [Node] })
const Animal = z
  .discriminatedUnion("__typename", [Dog, Cat])
  .meta({ title: "Animal" })

const rootResolver = resolver({
  post: query(Post.nullish())
    .input({ id: ID })
    .resolve(() => null),
  animals: query(z.array(Animal)).resolve(() => []),
  me: query(z.string().nullish()).resolve(() => useContext<Ctx>().user?.id),
  createPost: mutation(Post)
    .input({ input: PostInput })
    .resolve(({ input }) => ({
      id: "1",
      title: input.title,
      views: 0,
      createdAt: new Date(),
    })),
  countdown: subscription(z.int())
    .input({ from: z.int() })
    .subscribe(async function* ({ from }) {
      for (let i = from; i >= 0; i--) yield i
    }),
})

export const schema = weave(
  ZodWeaver,
  zodWeaverConfig,
  asyncContextProvider,
  rootResolver,
  postFields
)
```

:::

两者输出相同的 SDL（节选）：

```graphql
union Animal = Cat | Dog

type Cat implements Node {
  id: ID!
  lives: Int!
}

type Mutation {
  createPost(input: PostInput!): Post!
}

"""A post"""
type Post {
  createdAt: DateTime!
  id: ID!
  maybeTags: [String]
  shout(times: Int!): String!
  summary: String @deprecated(reason: "Use title")
  tags: [String!]!

  """The title"""
  title: String!
  views: Int!
}

input PostInput {
  role: Role
  tags: [String!]
  title: String!
}

type Subscription {
  countdown(from: Int!): Int!
}
```

上面的代码没有覆盖到的映射：

| Pothos | GQLoom |
| --- | --- |
| `new SchemaBuilder<Types>({ plugins })` | 没有 builder。使用 `weave(ZodWeaver, ...)` |
| `builder.toSchema()` | `weave(ZodWeaver, config, ...resolvers)`（调用 `useContext()` 时再加 `asyncContextProvider`） |
| `builder.objectType('X', { fields })`、`objectRef` + `implement` | `z.object({ ... }).meta({ title: "X" })` |
| `t.exposeString/Int/Float/Boolean('p')` | `z.object` 的属性：`z.string()`、`z.int()`、`z.number()`、`z.boolean()` |
| `t.exposeID('p')`、`t.arg.id()` | `ID` / `NullableID` 辅助常量（规则 8） |
| `t.string/int/field({ resolve })` | `resolver.of` 中的 `field(schema).resolve(parent => ...)` |
| `builder.objectFields(Ref, fields)`（在其他模块扩展类型） | 另一个 `resolver.of(Silk, { ... })` |
| `nullable: true` / `nullable: { list, items }` | `.nullish()` / `z.array(X.nullish()).nullish()` |
| 参数与输入上的 `required: true` | 不带修饰的 Zod 类型；省略 `required`，可选时用 `.nullish()` |
| `t.arg.string/int/float/boolean/id/stringList/...` | `.input({ ... })` 中的 Zod 类型 |
| `t.arg({ type: Input, required: true })` | `.input({ input: InputSilk })` |
| `builder.inputType`、`builder.inputRef` | 独立的 `z.object`，带 `.meta({ title })` |
| `description` | `.describe()` 或 `.meta({ description })`；操作与字段使用 `.description()` |
| `deprecationReason` | `.deprecationReason()` |
| `builder.enumType('E', { values })` | `z.enum([...]).meta({ title: "E" })` |
| `builder.unionType` + `resolveType` | `z.discriminatedUnion("__typename", [...]).meta({ title })` |
| `builder.interfaceType` + `interfaces: [I]` | `asObjectType({ interfaces: [I] })` |
| `builder.scalarType`、`addScalarType` | `ZodWeaver.config({ presetGraphQLType })` 或 `asField({ type })` |
| `builder.queryField`、`builder.mutationField` | `resolver({ ... })` 中的一项 |
| `context` 参数 | `useContext<Ctx>()` |
| `info` 参数 | `useResolverPayload().info` |
| `@pothos/plugin-scope-auth` 的 `authScopes` | 使用 `.use()` 的 `Middleware` |
| `@pothos/plugin-dataloader` | `field().load()` |
| `@pothos/plugin-zod`、`@pothos/plugin-validation` | Zod Schema 本身 |
| `@pothos/plugin-complexity` | 字段上的 `extensions: { complexity }`（仓库示例：`examples/query-complexity`） |
| `@pothos/plugin-federation` | [Federation](../advanced/federation.md) |
| `@pothos/plugin-simple-objects`（`builder.simpleObject`） | `z.object` |
| `@pothos/plugin-with-input`（`t.fieldWithInput`） | `.input({ input: NamedInputSilk })`，自行命名输入类型 |
| `@pothos/plugin-prisma`、`@pothos/plugin-drizzle` | 解析器工厂与 `relationField`（见下文） |
| `@pothos/plugin-relay`、`-errors`、`-sub-graph`、`-smart-subscriptions` | 停止（见[何时迁移与何时停止](#何时迁移与何时停止)） |

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
