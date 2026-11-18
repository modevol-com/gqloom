# Migrating from Pothos

## Why GQLoom

Both Pothos and GQLoom run natively in TypeScript without decorators, yet they start from fundamentally different philosophies.

Pothos takes a **GraphQL-first Builder** approach. It treats your internal data and your GraphQL API as two separate schemas, anchored on a shared builder where fields are defined inside callbacks and features are added through plugins.

GQLoom takes a **runtime-type-first Weaving** approach. Your validation schemas and ORM models already define your data and rules—so GQLoom weaves the GraphQL schema directly from them, keeping data, logic, and assembly cleanly separated.

- **One source of truth instead of parallel layers**

  Pothos separates internal models, GraphQL definitions, and validation rules into distinct layers you have to keep in sync. GQLoom starts from the schemas and ORM models you already have: one definition drives your TypeScript types, input validation, and GraphQL contract, while keeping your domain models decoupled from GraphQL.

- **Independent modules instead of a central Builder**

  Pothos's Builder pattern ties every file to one shared builder and wraps fields in callbacks. Modules rely on import-time registration and are harder to compose freely or run outside GraphQL. GQLoom has no shared builder: domain modules are plain, self-contained objects assembled explicitly at the entry point, and the same logic can also run directly in tests or non-GraphQL entry points.

- **Unified design instead of plugin sprawl**

  Pothos keeps its core narrow and splits everyday needs—validation, auth, batching, ORM integration—across plugins, each with its own options and coordination overhead. GQLoom connects directly to existing validation and ORM tools while building common cross-cutting concerns into one consistent core model.

If you intentionally want a strict wall between internal models and your GraphQL API, or depend on Pothos's builder plugins, Pothos remains a solid choice. When you want a single source of truth, independent modules, and less ceremony overall, GQLoom offers a simpler foundation.

## Overview and mental model

| | Pothos | GQLoom |
| --- | --- | --- |
| Types | `objectRef` + `implement`, `t.expose*` | Zod / Valibot / ORM models (silks) |
| Operations | `builder.queryType` / `mutationType` / `subscriptionType` | `resolver({ ... })` and `resolver.of(Silk, { ... })` |
| Schema | `builder.toSchema()` | `weave(ZodWeaver, ...resolvers)` takes them explicitly |
| Validation | Optional `@pothos/plugin-zod` / `@pothos/plugin-validation` | The schema itself; inputs are validated by default |
| Auth / Context | `authScopes`, `context` argument | Middleware, `useContext()` |

Migration recommendations:

- Use Zod (`@gqloom/zod`) by default. If your project already uses Valibot, or the data layer is backed by Prisma, Drizzle, or MikroORM, weave those existing schemas or models directly instead of maintaining a parallel Pothos declaration.
- Migrate incrementally by module. Keep `@pothos/core` installed during migration. Both `GraphQLSchema` instances can coexist and be combined with [`mergeSchemas`](https://the-guild.dev/graphql/tools/docs/schema-merging), or mounted on separate HTTP endpoints.
- Keep object silks for data properties only, and define computed or relational fields in `resolver.of(Silk, { ... })`. Copy nullability from the printed Pothos SDL (using `.nullish()` for nullable outputs and optional inputs) rather than guessing.

## Concept map

The table below highlights concepts and APIs with notable differences:

| Pothos | GQLoom | Notes |
| --- | --- | --- |
| `SchemaBuilder` + `builder.toSchema()` | `weave(ZodWeaver, config, ...resolvers)` | Add `asyncContextProvider` when `useContext()` is called; unreachable silks are omitted from the SDL |
| `builder.objectType` / `objectRef` + `implement` | `z.object({ ... }).meta({ title })` | Put computed and relational fields in `resolver.of`, not on the silk |
| `t.exposeString` / `Int` / `Float` / `Boolean` | Properties of `z.object` | All properties are exposed by default; hide private ones with `field.hidden` |
| `t.exposeID` / `t.arg.id` | `asField({ type: GraphQLID })` (`NullableID`) / `new GraphQLNonNull(GraphQLID)` (`ID`) | `z.string()` prints `String`; pick helper from SDL (rule 8) |
| `t.string` / `t.field({ resolve })` | `resolver.of(Silk, { name: field(type).resolve((parent) => ...) })` | Parent is the first argument of `resolve` |
| `builder.objectFields(Ref, fields)` | Another `resolver.of(Silk, { ... })` | Extend a type from another module |
| `builder.inputType` / `builder.inputRef` | Separate `z.object({ ... }).meta({ title })` | Do not reuse an object silk as an input |
| `builder.queryType` / `mutationType` / `subscriptionType` / `*Field` | `resolver({ ... })` with `query`, `mutation`, `subscription` | Subscriptions use `.subscribe(async function* ...)` |
| `t.arg.*` / `args` | `.input({ ... })` | Arguments become one object |
| `builder.enumType` | `z.enum([...]).meta({ title })` | |
| `builder.unionType` + `resolveType` | `z.discriminatedUnion("__typename", [...]).meta({ title })` | Or `z.union` with `asUnionType` / `resolveType` |
| `builder.interfaceType` + `interfaces: [I]` | `silk(new GraphQLInterfaceType(...))` + `asObjectType({ interfaces: [I] })` | Wrap `GraphQLInterfaceType` with `silk()` when queries/fields return the interface; pass unreferenced implementors to `weave()` |
| `builder.scalarType` / `addScalarType` | `ZodWeaver.config({ presetGraphQLType })` or `asField({ type })` | Map `Date` (`z.ZodDate`) globally in `presetGraphQLType` |
| `context` argument | [`useContext<Ctx>()`](../context.md) | Requires `asyncContextProvider` |
| `info` argument | `useResolverPayload().info` | |
| `@pothos/plugin-scope-auth` (`authScopes`) | [Middleware](../middleware.md) with `.use()` | Operations use `.use()`, object fields use `field().use()` |
| `@pothos/plugin-dataloader` (`loadableObject`, `t.loadable`) | [`field().load()`](../dataloader.md) | Pass `contextValue: {}` in tests |
| `@pothos/plugin-zod` / `@pothos/plugin-validation` | Zod schema rules | Inputs are validated before `resolve` |
| `@pothos/plugin-complexity` | `extensions: { complexity }` | Repository example: `examples/query-complexity` |
| `@pothos/plugin-federation` | [Federation](../advanced/federation.md) | |
| `@pothos/plugin-simple-objects` (`builder.simpleObject`) | `z.object` | |
| `@pothos/plugin-with-input` (`t.fieldWithInput`) | `.input({ input: NamedInputSilk })` | Name the input silk explicitly |
| `@pothos/plugin-prisma` / `@pothos/plugin-drizzle` | Resolver factories and `relationField` | See [Prisma and Drizzle plugins](#prisma-and-drizzle-plugins) |
| `@pothos/plugin-relay` (`builder.node`, `t.connection`) | `silk(new GraphQLInterfaceType(...))` for `Node`; Zod silks for `PageInfo`, `*Edge`, `*Connection` | Keep exact SDL and ID/cursor encoding; see [Relay](#relay) |
| `@pothos/plugin-errors` (`errors: { types }`) | Result union (`z.discriminatedUnion` / `z.union`) or `GraphQLError` with `extensions` | Pick by whether `before.graphql` has a union; see [Errors](#errors) |
| `@pothos/plugin-sub-graph` (`subGraphs`) | Separate `weave()` per audience | Pass only that audience's resolvers; see [Sub-graphs](#sub-graphs) |
| `@pothos/plugin-smart-subscriptions` (`smartSubscriptions`) | `subscription()` + pubsub (`createPubSub`) | Publish explicitly from mutations; see [Smart Subscriptions](#smart-subscriptions) |
| `variant`, `@pothos/plugin-prisma-utils` / Drizzle filter & order inputs | Separate silks named with `.meta({ title })` | Keep original SDL type names; see [Variants and generated inputs](#variants-and-generated-inputs) |

Common field options mapping:

- `description` → `z.describe()` or `z.meta({ description })` on silk properties (operations and fields use `.description()`)
- `deprecationReason` → `.deprecationReason()`
- `nullable: true` / optional args → `.nullish()` (`z.array(X.nullish()).nullish()` for `nullable: { list: true, items: true }`)
- `required: true` on args and inputs → bare Zod type (omit `.nullish()`)

Declare ordinary names and descriptions with `z.describe()` or `z.meta()`, and map global scalars such as `Date` once with `ZodWeaver.config({ presetGraphQLType })`. Use `asObjectType` and `asField` only when Zod metadata cannot express GraphQL-only configurations, such as interfaces (`asObjectType({ interfaces })`), `ID` scalars (`asField({ type })`), or extensions.

## Rules

A model that only reads this page must follow these rules. Each rule is repeated with its snippet later on.

1. MUST save the Pothos SDL before touching code: `printSchema(lexicographicSortSchema(builder.toSchema()))` written to `before.graphql`. The migration is done only when every module is migrated, the GQLoom SDL has an empty `diff` (aside from any intentionally documented contract changes), and replayed requests return the expected JSON.
2. MUST copy nullability from the printed SDL, never from memory. Pothos 4 prints nullable outputs and optional args unless the builder sets `defaultFieldNullability: false`; Pothos 3 printed non-null outputs. Port every nullable output and every optional input as `.nullish()` (one spelling; `.nullable()` makes TypeScript reject a resolver that returns `undefined`). Everything else is the bare Zod type.
3. MUST turn each Pothos object type into one `z.object({ ... }).meta({ title: "Name" })`. Do not copy `objectRef`, `implement`, or `builder`.
4. MUST define every computed or relational field with `resolver.of(Silk, { name: field(type).resolve((parent) => ...) })`. The parent is the first argument of `resolve`; there is no `t` callback and no `ctx` argument.
5. MUST define every root field with `resolver({ name: query(...) | mutation(...) | subscription(...) })`. Arguments go through `.input({ ... })` only.
6. MUST hide every property of the Zod object (or ORM model) that Pothos did not expose with `t.expose*`, using `name: field.hidden` inside `resolver.of`. A Zod object exposes every property.
7. MUST declare input objects as separate silks with their own `.meta({ title })`. MUST NOT use an object silk as an input.
8. MUST define two ID helpers once: `NullableID` (`asField({ type: GraphQLID })`, prints `ID`) and `ID` (`asField({ type: new GraphQLNonNull(GraphQLID) })`, prints `ID!`). `z.string()` prints `String`, and `.nullish()` does not undo `GraphQLNonNull`.
9. MUST pass `asyncContextProvider` to `weave` whenever any resolver or middleware calls `useContext<Context>()`; without it `useContext()` throws. If nothing calls `useContext()`, leave it out.
10. MUST turn each `authScopes` into a `Middleware`. On operations use `.use(guard)`; on a property of an object use `field(...).use(guard).resolve(...)` inside `resolver.of`. A guard on a query does not protect fields of the object it returns.
11. MUST map `builder.addScalarType` and `Date` to `ZodWeaver.config({ presetGraphQLType })`. Enums are `z.enum([...]).meta({ title })`. Union members are `z.object` with a `__typename` literal, combined by `z.discriminatedUnion("__typename", [...]).meta({ title })`.
12. MUST replace N+1 patterns (`loadableObject`, `t.loadable`, Prisma/Drizzle relation plugins) with `field(...).load(...)` or the resolver factory's `relationField()`. In tests, execute with `contextValue: {}` or batching is disabled.
13. MUST replace `builder.toSchema()` with `weave(ZodWeaver, config, ...resolvers)` (add `asyncContextProvider` only when rule 9 applies). A silk that no resolver can reach is not in the SDL; pass unreferenced interface or union implementors directly to `weave()`.
14. MUST wrap `new GraphQLInterfaceType({ ... })` with `silk()` when a query or field returns an interface (such as Relay `Node` or `Error`), and reference it in `asObjectType({ interfaces: [Iface] })`. MUST NOT pass a `z.object` interface definition directly to `query()` or `field()` alongside `asObjectType({ interfaces: [Iface] })`—that creates duplicate types with the same name.
15. MUST migrate every Pothos module and plugin completely to GQLoom—never leave a Pothos module behind:
    - Relay: model `Node` with `silk(new GraphQLInterfaceType(...))`, and `PageInfo`, `*Edge`, and `*Connection` with Zod silks whose SDL matches `before.graphql`.
    - Errors: model result unions (`z.discriminatedUnion` / `z.union`) when `before.graphql` has a union, or throw `GraphQLError` with `extensions` when it does not (documenting the contract change if switching away from a union).
    - Sub-graphs: create a separate `weave()` per audience with only the resolvers that audience needs.
    - Smart Subscriptions: use ordinary `subscription()` + pubsub and publish explicitly from mutations.
    - Variants and generated filter/order inputs: create separate silks using the original SDL type names so clients do not notice.
16. MUST NOT uninstall any `@pothos/*` package or mix `builder` and GQLoom resolvers in one file until every module is migrated and passes rule 1.

## Migration practices

### Scaffold

Install the packages and delete the builder module:

<!--@include: ../../snippets/install-zod.md-->

Create the weave entry. Global scalars and every resolver go here. Add `asyncContextProvider` only if some resolver or middleware calls `useContext()` (see [Auth and context](#auth-and-context)):

```ts twoslash
import { weave, resolver, query } from "@gqloom/core"
import { ZodWeaver } from "@gqloom/zod"
import * as z from "zod"

const helloResolver = resolver({
  hello: query(z.string()).resolve(() => "Hello"),
})

export const schema = weave(ZodWeaver, helloResolver)
```

Print the schema the same way you printed the Pothos one, and diff the two files after every module:

```ts
import { writeFileSync } from "node:fs"
import { lexicographicSortSchema, printSchema } from "graphql"
import { schema } from "./schema"

writeFileSync("after.graphql", printSchema(lexicographicSortSchema(schema)))
```

### Types

Each Pothos object becomes one Zod object. Name it with `.meta({ title })`, describe it with `.describe()` or `.meta({ description })`.

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

Nullability follows the printed SDL. The table maps the Pothos 4 defaults:

| Pothos 4 (default builder) | SDL | Zod output | Zod input |
| --- | --- | --- | --- |
| `t.string({ resolve })` | `String` | `z.string().nullish()` | |
| `t.string({ nullable: false, resolve })` | `String!` | `z.string()` | |
| `t.arg.string()` | `String` | | `z.string().nullish()` |
| `t.arg.string({ required: true })` | `String!` | | `z.string()` |
| `t.field({ type: [Post], nullable: true })` | `[Post!]` | `z.array(Post).nullish()` | |
| `t.field({ type: [Post], nullable: { list: true, items: true } })` | `[Post]` | `z.array(Post.nullish()).nullish()` | |

With `defaultFieldNullability: false` (or Pothos 3) the first row is `String!`. Tightening a nullable field later is a deliberate schema change; do it after the diff is empty, not during the port.

Pothos only exposes what you list with `t.expose*`. A Zod object exposes every property, so hide the ones Pothos kept private (foreign keys, password hashes) in `resolver.of`:

```ts
const Comment = z
  .object({ id: NullableID, authorId: z.string(), comment: z.string().nullish() })
  .meta({ title: "Comment" })

const commentFields = resolver.of(Comment, {
  authorId: field.hidden, // [!code hl]
})
```

### Resolvers

Root fields go in `resolver`, fields of an object go in `resolver.of`. Arguments are one object passed to `.input`.

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

Do not pass queries or mutations to `resolver.of`. Do not put `resolve` logic inside `z.object`.

### Auth and context

Pothos reads the context from the third argument of every resolver and creates it in the server. GQLoom reads it with `useContext()` and the server creates it the same way. `initContextCache()` is not needed.

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

Each Pothos `authScopes` becomes a middleware. A scope map with several keys is "any of" in Pothos; write the condition you actually need.

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

For a Pothos type-level `authScopes` (on `builder.objectType`), add a `field(...).use(guard)` for each field that must be protected; properties that exist only on the silk run no middleware.

### Prisma and Drizzle plugins

The Pothos plugin maps a model to a GraphQL type (`prismaObject`, `drizzleObject`), exposes columns with `t.expose*`, and plans queries from the selection. In GQLoom the model is already the silk: no mapping call, no `PrismaTypes` generic. Use the resolver factory for CRUD and relations, and `useSelectedFields` / `useSelectedColumns` when you write a query by hand.

Prisma. Replace the `pothos` generator block with the GQLoom one and run `npx prisma generate`:

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

Hide columns with `field.hidden` (for example `password: field.hidden`), not by leaving them out of a field list. For a Prisma model, `@id` columns are emitted as `ID`.

Drizzle. Tables are wrapped with `drizzleSilk`; the factory takes the Drizzle client and the table. The snippet type-checks against the Drizzle version this site is built with:

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

`selectSingleQuery().input(...)` replaces the `args` of `t.drizzleField`: the Zod object defines the GraphQL arguments and `.transform` converts them to Drizzle query options. `derivedFrom` plays the role of Pothos `select: { columns }`: it tells the selection logic which columns the computed field needs.

### N+1

Pothos solves N+1 with `loadableObject` or `t.loadable`, which turn a returned key into an object through a shared DataLoader. In GQLoom, put `.load()` on the field. The loader function receives all parents of one tick and must return one result per parent in the same order.

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

On the example's data (5 posts, `posts { id author { id } }`), the batch function ran 1 time with a context object and 5 times without one: batching is keyed by the request context object. Servers such as Yoga always provide one; in unit tests pass `contextValue: {}` to `graphql()`.

Check query counts yourself before and after: enable `log: ["query"]` (Prisma) or `logger: true` (Drizzle) and compare the number of statements for the same request. With the ORM plugins, `relationField` replaces `t.relation`; do not assume it produces the same single joined query. When a hot path needs a single joined query or `include` / `with` tree instead of per-field batching, write that query explicitly in `resolver` using Prisma `include` (or `useSelectedFields`) or Drizzle `db.query.*.findMany({ with: ... })` (or `useSelectedColumns`).

### Relay

`@pothos/plugin-relay` generates the `Node` interface, `node`/`nodes` queries, global IDs, `PageInfo`, `*Edge`, and `*Connection` types. Model every piece with GQLoom silks so `after.graphql` matches `before.graphql` verbatim:

- Define `Node` with `silk(new GraphQLInterfaceType(...))` (never a `z.object` if a query or field returns `Node`; see rule 14).
- Implement `Node` on each node object via `.register(asObjectType, { interfaces: [Node] })`, override `id` in `resolver.of` to return the encoded global ID (preserving Pothos's `TypeName:id` base64 format), and pass any unreferenced implementor silks to `weave(...)`.
- Define `PageInfo`, `*Edge`, and `*Connection` as Zod object silks whose `.meta({ title })` names and field nullability match `before.graphql` (`z.array(Edge.nullish())` for `[UserEdge]!`, `z.array(Edge.nullish()).nullish()` for `[UserEdge]`, `z.array(Edge)` for `[UserEdge!]!`).

```ts
// Pothos (@pothos/plugin-relay)
builder.node(User, {
  id: { resolve: (user) => user.id },
  loadOne: (id) => usersDb.get(id),
  fields: (t) => ({ name: t.exposeString("name") }),
})

builder.queryType({
  fields: (t) => ({
    users: t.connection({
      type: User,
      resolve: (_root, args) => resolveArrayConnection({ args }, [...usersDb.values()]),
    }),
  }),
})
```

```ts twoslash
import { field, query, resolver, silk, weave } from "@gqloom/core"
import { ZodWeaver, asField, asObjectType } from "@gqloom/zod"
import {
  GraphQLID,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLNonNull,
} from "graphql"
import * as z from "zod"

const ID = z.string().register(asField, { type: new GraphQLNonNull(GraphQLID) })

function encodeGlobalId(type: string, id: string) {
  return Buffer.from(`${type}:${id}`).toString("base64")
}

function decodeGlobalId(globalId: string) {
  const decoded = Buffer.from(globalId, "base64").toString("utf8")
  const sep = decoded.indexOf(":")
  if (sep === -1) throw new Error(`Invalid global ID: ${globalId}`)
  return { type: decoded.slice(0, sep), id: decoded.slice(sep + 1) }
}

interface INode {
  id: string
}

const NodeInterface = new GraphQLInterfaceType({
  name: "Node",
  fields: () => ({ id: { type: new GraphQLNonNull(GraphQLID) } }),
  resolveType: (value: { __typename?: string }) => value.__typename,
})

const Node = silk<INode>(NodeInterface)
const NullableNodeList = silk<(INode | null)[]>(
  new GraphQLNonNull(new GraphQLList(NodeInterface))
)

const User = z
  .object({
    __typename: z.literal("User").nullish(),
    id: ID,
    name: z.string(),
  })
  // Zod v4 registry's $replace drops GraphQLInterfaceType private members
  .register(asObjectType, { interfaces: [Node as never] })

const PageInfo = z
  .object({
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
    startCursor: z.string().nullish(),
    endCursor: z.string().nullish(),
  })
  .meta({ title: "PageInfo" })

function createConnectionSilks<TNode extends z.ZodType>(
  namePrefix: string,
  nodeSilk: TNode
) {
  const Edge = z
    .object({ cursor: z.string(), node: nodeSilk })
    .meta({ title: `${namePrefix}Edge` })
  const Connection = z
    .object({
      pageInfo: PageInfo,
      edges: z.array(Edge.nullish()),
    })
    .meta({ title: `${namePrefix}Connection` })
  return { Edge, Connection }
}

const { Connection: UserConnection } = createConnectionSilks("User", User)

const usersDb = new Map<string, { id: string; name: string }>([
  ["1", { id: "1", name: "Ada" }],
])

function resolveNode(globalId: string) {
  const { type, id } = decodeGlobalId(globalId)
  if (type === "User") {
    const user = usersDb.get(id)
    return user ? { ...user, __typename: "User" as const } : null
  }
  return null
}

function paginateSlice<T>(
  items: T[],
  args: {
    first?: number | null
    after?: string | null
    last?: number | null
    before?: string | null
  }
) {
  const decodeCursor = (c: string) =>
    Number(Buffer.from(c, "base64").toString("utf8").replace("cursor:", ""))
  const encodeCursor = (idx: number) =>
    Buffer.from(`cursor:${idx}`).toString("base64")

  const start = args.after ? Math.max(0, decodeCursor(args.after) + 1) : 0
  const end = args.before
    ? Math.min(items.length, decodeCursor(args.before))
    : items.length
  const window = items.slice(start, end)
  const sliced =
    args.first != null
      ? window.slice(0, args.first)
      : args.last != null
        ? window.slice(Math.max(0, window.length - args.last))
        : window

  const edges = sliced.map((node, i) => ({
    cursor: encodeCursor(start + i),
    node,
  }))
  return {
    edges,
    pageInfo: {
      hasPreviousPage: start > 0,
      hasNextPage: start + sliced.length < end,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges.at(-1)?.cursor ?? null,
    },
  }
}

const userFields = resolver.of(User, {
  id: field(ID).resolve((user) => encodeGlobalId("User", user.id)),
})

const relayQueries = resolver({
  node: query(silk.nullable(Node))
    .input({ id: ID })
    .resolve(({ id }) => resolveNode(id)),
  nodes: query(NullableNodeList)
    .input({ ids: z.array(ID) })
    .resolve(({ ids }) => ids.map((id) => resolveNode(id))),
  users: query(UserConnection)
    .input({
      first: z.int().nullish(),
      after: z.string().nullish(),
      last: z.int().nullish(),
      before: z.string().nullish(),
    })
    .resolve((args) => paginateSlice([...usersDb.values()], args)),
})

export const schema = weave(ZodWeaver, relayQueries, userFields, User)
```

For nested connection fields on an object (`t.connection` / `t.relatedConnection`), add `field(PostConnection).input({ ... }).resolve(...)` (or `.load(...)` for batching) inside `resolver.of(User, { ... })`. If `before.graphql` uses `ID` for cursors (`cursorType: "ID"`), swap `z.string()` on `cursor`, `startCursor`, `endCursor`, `after`, and `before` for `NullableID` / `ID`. If you use Drizzle or Prisma column selection alongside the `id` override above, chain `.derivedFrom("id")` on `id: field(ID)` so the primary key is always fetched.

### Errors

Check `before.graphql` to choose between the two GQLoom patterns:

1. **Original SDL has a result union** (`union MutationCreatePostResult = BaseError | MutationCreatePostSuccess` or `directResult: true` unions): keep the exact SDL using `silk(new GraphQLInterfaceType(...))` for `Error` and `z.discriminatedUnion` (or `z.union` with `asUnionType`) for the result union.
2. **Original SDL does not have a union** (or you intentionally migrate away from error unions): throw `new GraphQLError(message, { extensions: { code } })` inside resolvers or map domain error classes in a global middleware passed to `weave`.

```ts twoslash
import { mutation, query, resolver, silk, weave, type Middleware } from "@gqloom/core"
import { ZodWeaver, asField, asObjectType } from "@gqloom/zod"
import {
  GraphQLError,
  GraphQLID,
  GraphQLInterfaceType,
  GraphQLNonNull,
  GraphQLString,
} from "graphql"
import * as z from "zod"

const ID = z.string().register(asField, { type: new GraphQLNonNull(GraphQLID) })
const Post = z.object({ id: ID, title: z.string() }).meta({ title: "Post" })

// Option A: before.graphql has a result union (SDL unchanged)
const ErrorInterface = silk<{ message: string }>(
  new GraphQLInterfaceType({
    name: "Error",
    fields: () => ({ message: { type: new GraphQLNonNull(GraphQLString) } }),
    resolveType: (value: { __typename?: string }) => value.__typename,
  })
)

const BaseError = z
  .object({ __typename: z.literal("BaseError"), message: z.string() })
  // Zod v4 registry's $replace drops GraphQLInterfaceType private members
  .register(asObjectType, { interfaces: [ErrorInterface as never] })

const MutationCreatePostSuccess = z
  .object({
    __typename: z.literal("MutationCreatePostSuccess"),
    data: Post,
  })
  .meta({ title: "MutationCreatePostSuccess" })

const MutationCreatePostResult = z
  .discriminatedUnion("__typename", [BaseError, MutationCreatePostSuccess])
  .meta({ title: "MutationCreatePostResult" })

// Option B: no union in SDL -> throw GraphQLError with extensions
class NotFoundError extends Error {
  public readonly code = "NOT_FOUND"
}

const mapDomainErrors: Middleware = async (next) => {
  try {
    return await next()
  } catch (err) {
    if (err instanceof NotFoundError) {
      throw new GraphQLError(err.message, { extensions: { code: err.code } })
    }
    throw err
  }
}

const postResolver = resolver({
  post: query(Post).input({ id: ID }).resolve(() => {
    throw new NotFoundError("Post not found")
  }),
  createPost: mutation(MutationCreatePostResult)
    .input({ title: z.string() })
    .resolve(({ title }) => {
      if (!title.trim()) {
        return { __typename: "BaseError", message: "Title is required" }
      }
      return {
        __typename: "MutationCreatePostSuccess",
        data: { id: "1", title },
      }
    }),
})

export const schema = weave(ZodWeaver, mapDomainErrors, postResolver)
```

For Pothos `directResult: true` unions (for example `union CreatePostResult = BaseError | Post`), use `z.union([BaseError, Post]).register(asUnionType, { name: "CreatePostResult", resolveType: (v) => ("message" in v ? "BaseError" : "Post") })`.

Contract change when switching away from an error union to `GraphQLError`: `interface Error`, `*Error`, `*Success`, and `union *Result` are removed from the SDL, and the operation returns `Post!` (or `Post`) directly. Runtime errors move from `data.<op>` (`{ __typename: "BaseError", message }`) to the top-level `errors` array (`errors[0].extensions.code`) with `data.<op>: null` (or `data: null` if non-null). Update clients to drop `... on *Success` / `... on Error` fragments, select fields directly on the return type, and inspect `result.errors`.

### Sub-graphs

`@pothos/plugin-sub-graph` tags fields and types on a shared builder and emits filtered schemas with `builder.toSchema({ subGraph })`. In GQLoom, compose a separate `weave()` call for each audience, passing only the resolvers and silks that audience should see:

```ts twoslash
import { field, query, resolver, weave } from "@gqloom/core"
import { ZodWeaver } from "@gqloom/zod"
import * as z from "zod"

const User = z
  .object({
    id: z.string(),
    name: z.string(),
    internalNotes: z.string(),
  })
  .meta({ title: "User" })

// Hide internal-only columns in the public sub-graph without affecting other weaves
const publicUserFields = resolver.of(User, {
  internalNotes: field.hidden,
})

const publicQueries = resolver({
  user: query(User.nullish()).resolve(() => null),
})

const internalQueries = resolver({
  user: query(User.nullish()).resolve(() => null),
  auditLog: query(z.array(z.string())).resolve(() => []),
})

export const publicSchema = weave(ZodWeaver, publicQueries, publicUserFields)
export const internalSchema = weave(ZodWeaver, internalQueries)
```

Each `weave()` runs in its own isolated context, so `field.hidden` in `publicUserFields` only hides `internalNotes` from `publicSchema`. Any type reachable only from `internalQueries` is omitted automatically from `publicSchema`. Add `asyncContextProvider` to every `weave()` whose resolvers or middlewares call `useContext()`. Diff each audience schema separately (`before.public.graphql` vs `after.public.graphql`).

### Smart Subscriptions

`@pothos/plugin-smart-subscriptions` hooks live invalidation into queries and fields via topic registration. In GQLoom, replace it with standard `subscription()` operations backed by a pubsub (such as `createPubSub` from `graphql-yoga`, or Redis pubsub in multi-instance deployments), and call `pubSub.publish(...)` explicitly from mutations:

```ts twoslash
import { mutation, query, resolver, subscription, weave } from "@gqloom/core"
import { ZodWeaver } from "@gqloom/zod"
import { createPubSub } from "graphql-yoga"
import * as z from "zod"

const Post = z.object({ id: z.string(), title: z.string() }).meta({ title: "Post" })
type IPost = z.infer<typeof Post>

const pubSub = createPubSub<{
  postsUpdated: []
  postUpdated: [postId: string, post: IPost]
}>()

const postsStore: IPost[] = []

export const postResolver = resolver({
  posts: query(z.array(Post)).resolve(() => postsStore),

  createPost: mutation(Post)
    .input({ title: z.string() })
    .resolve(({ title }) => {
      const post = { id: String(postsStore.length + 1), title }
      postsStore.push(post)
      pubSub.publish("postsUpdated")
      pubSub.publish("postUpdated", post.id, post)
      return post
    }),

  watchPosts: subscription(z.array(Post))
    .subscribe(() => pubSub.subscribe("postsUpdated"))
    .resolve(() => postsStore),

  watchPost: subscription(Post)
    .input({ id: z.string() })
    .subscribe(({ id }) => pubSub.subscribe("postUpdated", id))
    .resolve((post) => post),
})

export const schema = weave(ZodWeaver, postResolver)
```

Contract and behavior differences to account for:

- If `before.graphql` already exposed the field on `type Subscription`, matching the field name, input args, and output silk keeps the SDL identical.
- If Pothos Smart Subscriptions exposed a live field on `type Query` or relied on automatic child-type invalidation (for example, re-running a `posts` subscription automatically whenever a nested `Comment` mutated), GQLoom does not turn `Query` fields into subscriptions or track nested selection dependencies implicitly. Move any live operation onto `Subscription` (clients send `subscription { ... }` instead of a smart `query`), and publish all affected parent and item topics explicitly from every relevant mutation or domain service.

### Variants and generated inputs

One ORM silk maps to one GraphQL object type name (`User` or `users`), and GQLoom's resolver factories emit their own input type names (`UserWhereInput`, `UsersFilters`, `UsersOrderBy`). To preserve Pothos `variant` types and `@pothos/plugin-prisma-utils` / `@pothos/plugin-drizzle` generated filter and order input types without changing the SDL, define separate silks with the original SDL names:

```ts twoslash
import { field, query, resolver, weave } from "@gqloom/core"
import { asyncContextProvider } from "@gqloom/core/context"
import { DrizzleWeaver, drizzleSilk } from "@gqloom/drizzle"
import { useSelectedColumns } from "@gqloom/drizzle/context"
import { ZodWeaver, asField } from "@gqloom/zod"
import { and, asc, desc, eq, ilike, or, type SQL } from "drizzle-orm"
import * as t from "drizzle-orm/sqlite-core"
import { GraphQLID, GraphQLNonNull } from "graphql"
import * as z from "zod"

const IntID = z.int().register(asField, { type: new GraphQLNonNull(GraphQLID) })

const users = drizzleSilk(
  t.sqliteTable("users", {
    id: t.int().primaryKey({ autoIncrement: true }),
    email: t.text().notNull(),
    firstName: t.text().notNull(),
    lastName: t.text().notNull(),
    passwordHash: t.text().notNull(),
  }),
  { name: "User" }
)

// Variant: separate silk with the original SDL type name "Viewer"
const Viewer = z
  .object({
    id: IntID,
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  })
  .meta({ title: "Viewer" })

const viewerFields = resolver.of(Viewer, {
  firstName: field.hidden,
  lastName: field.hidden,
  fullName: field(z.string())
    .derivedFrom("firstName", "lastName")
    .resolve((u) => `${u.firstName} ${u.lastName}`),
})

// Generated filter & order inputs: match exact names from before.graphql
const OrderBy = z.enum(["asc", "desc"]).meta({ title: "OrderBy" })

const StringFilter = z
  .object({
    equals: z.string().nullish(),
    contains: z.string().nullish(),
  })
  .meta({ title: "StringFilter" })

const UserFilter = z
  .object({
    email: StringFilter.nullish(),
    get AND() {
      return z.array(UserFilter).nullish()
    },
    get OR() {
      return z.array(UserFilter).nullish()
    },
  })
  .meta({ title: "UserFilter" })

const UserOrderBy = z
  .object({ email: OrderBy.nullish() })
  .meta({ title: "UserOrderBy" })

function toUserWhere(filter?: z.infer<typeof UserFilter> | null): SQL | undefined {
  if (!filter) return undefined
  const parts: (SQL | undefined)[] = []
  if (filter.email?.equals != null) parts.push(eq(users.email, filter.email.equals))
  if (filter.email?.contains != null) {
    parts.push(ilike(users.email, `%${filter.email.contains}%`))
  }
  if (filter.AND?.length) parts.push(and(...filter.AND.map(toUserWhere)))
  if (filter.OR?.length) parts.push(or(...filter.OR.map(toUserWhere)))
  return and(...parts)
}

const userResolver = resolver.of(users, {
  passwordHash: field.hidden,
  viewer: query(Viewer.nullish()).resolve(() => {
    const columns = useSelectedColumns(users)
    void columns
    return { id: 1, email: "ada@example.com", firstName: "Ada", lastName: "Lovelace" }
  }),
  users: query(users.$list())
    .input({
      where: UserFilter.nullish(),
      orderBy: z.array(UserOrderBy).nullish(),
    })
    .resolve(({ where, orderBy }) => {
      void toUserWhere(where)
      void orderBy?.map((o) =>
        o.email === "desc" ? desc(users.email) : asc(users.email)
      )
      return []
    }),
})

export const schema = weave(
  ZodWeaver,
  DrizzleWeaver,
  asyncContextProvider,
  userResolver,
  viewerFields
)
```

Note two details when preserving Pothos filter/order inputs:

- Keep `.meta({ title })` directly on the `z.object(...)` (or inside `z.lazy(() => z.object(...).meta({ title }))`, not outside `z.lazy`); otherwise GQLoom auto-aliases the input type name from the query and field names.
- Match operator semantics during request replay—for example, `ilike` vs `like` in Drizzle or `mode: "insensitive"` in Prisma—so filtered query results match Pothos as well as the SDL.

## Gotchas

Each item shows the wrong result that was observed and the fix.

- Nullability: the Pothos 4 SDL has `title: String`. Writing `title: z.string()` prints `String!`, which changes how errors propagate. Writing `z.string().nullable()` prints `String` but fails type-checking when a resolver returns `undefined` (`Map.get(...)`): `Type 'IUser | undefined' is not assignable to type 'MayPromise<... | null>'`.

  ```ts
  const Post = z.object({ title: z.string() }).meta({ title: "Post" }) // [!code --]
  const Post = z.object({ title: z.string().nullish() }).meta({ title: "Post" }) // [!code ++]
  ```

- Every property is exposed. A Zod object has no equivalent of "do not `t.expose` this column". Without `field.hidden`, the SDL gains `authorId: String!` and `postId: String!` on `Comment`.

  ```ts
  const commentFields = resolver.of(Comment, {
    authorId: field.hidden, // [!code ++]
    postId: field.hidden, // [!code ++]
    author: field(User.nullish()).resolve((comment) => Users.get(comment.authorId)),
  })
  ```

- ID scalars: `z.string()` prints `String`. `asField({ type })` replaces the GraphQL type and drops `!`, and `ID.nullish()` on a `GraphQLNonNull` type still prints `ID!`. Use the two helpers from rule 8 and pick by SDL.

  ```ts
  const id = z.string() // prints String // [!code --]
  const ID = z.string().register(asField, { type: new GraphQLNonNull(GraphQLID) }) // ID! // [!code ++]
  const NullableID = z.string().register(asField, { type: GraphQLID }) // ID // [!code ++]
  ```

- Dates: `z.date()` prints `String`. Register the scalar once with `ZodWeaver.config({ presetGraphQLType })` (see the concept map) and pass the config to `weave`.

- Input and object types are different types. Using one silk for both fails at `weave` with `Schema must contain uniquely named types but contains multiple types named "P"`.

  ```ts
  mk: mutation(P).input({ p: P }) // [!code --]
  mk: mutation(P).input({ p: PInput }) // [!code ++]
  ```

- `useContext()` without `asyncContextProvider` throws `Cannot read properties of undefined (reading 'user')` at the first resolver that calls it.

  ```ts
  weave(ZodWeaver, rootResolver) // [!code --]
  weave(ZodWeaver, asyncContextProvider, rootResolver) // [!code ++]
  ```

- A middleware on an operation protects that operation only. A property of the returned object runs no middleware unless it is declared as a field in `resolver.of`, so a guard on one query leaves the same property reachable through another query or relation. Move the Pothos field-level `authScopes` to the field:

  ```ts
  const secretFields = resolver.of(Sec, {
    secret: field(z.string()).use(adminOnly).resolve((sec) => sec.secret), // [!code ++]
  })
  ```

- Interface-typed fields. `query(Node)` where `Node` is a `z.object` also used in `asObjectType({ interfaces: [Node] })` fails with `Schema must contain uniquely named types but contains multiple types named "Node"`. To return a GraphQL interface without changing the SDL (such as Relay `Node` or `Error`), wrap `new GraphQLInterfaceType({ ... })` with `silk()` and pass any unreferenced implementors to `weave(...)`. Only use `z.discriminatedUnion("__typename", [Dog, Cat])` if you intentionally want to replace the interface with a union (a contract change requiring clients to use inline fragments).

- Putting `.meta({ title })` outside `z.lazy(...)` on recursive input types causes GQLoom to ignore the title and auto-alias the type from the operation and field names (for example `FilterPostsWhereInput` instead of `PostWhereInput`). Put `.meta({ title })` on the `z.object(...)` inside `z.lazy`, or use Zod v4 getter syntax (`get AND() { ... }`).

- Validation: GQLoom validates arguments against the Zod schema before `resolve`. A failure rejects the request with `extensions.issues` (for example `{"message":"Invalid email address","extensions":{"issues":[...]}}`). Update clients that parse the error shape of `@pothos/plugin-zod` or `@pothos/plugin-validation`.

- `.optional()` inputs reject an explicit `null`. `z.int().optional()` prints `Int`, but `{ a(x: null) }` fails with `Invalid input: expected number, received null`, while Pothos `t.arg.int()` accepts it. Use `.nullish()` for every optional Pothos argument and input field.

  ```ts
  .input({ take: z.int().optional() }) // [!code --]
  .input({ take: z.int().nullish() }) // [!code ++]
  ```

## Verification

The goal of migration is an unchanged contract and unchanged behavior (with any unavoidable contract changes—such as dropping an error union for `GraphQLError` or moving a smart subscription to `Subscription`—explicitly documented).

1. Before any change, print the Pothos SDL:

   ```ts
   import { writeFileSync } from "node:fs"
   import { lexicographicSortSchema, printSchema } from "graphql"
   import { builder } from "./builder"

   writeFileSync("before.graphql", printSchema(lexicographicSortSchema(builder.toSchema())))
   ```

2. After each module, print the GQLoom SDL with the same call (see [Scaffold](#scaffold)) and compare:

   ```sh
   diff before.graphql after.graphql
   ```

   The output must be empty (or show only the intentional contract changes you documented). Fix the schema, not the file.

3. Replay requests against both schemas and compare the JSON. The same four requests are used for the reference port:

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

   Replay the queries, mutations, and subscriptions your clients really send. Include one request with a missing required argument; the validation error text must match as well. Authorization and input-validation errors from resolvers will differ in `extensions` (see [Gotchas](#gotchas)); update the assertions deliberately.

## Reference implementation

The following ports the official Pothos [`simple-interfaces`](https://github.com/hayes/pothos/tree/main/examples/simple-interfaces) example. `data.ts` is unchanged (it keeps the `IUser`, `IPost`, `IComment` interfaces and the three `Map`s), `builder.ts` is deleted, and `server.ts` only changes its import if you export `schema` from a different path.

The Pothos SDL printed by `@pothos/core` 4.18.0 is all-nullable for fields, which differs from the non-null SDL in that example's README (written for an older default). The port copies the SDL that Pothos actually prints:

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

Differences you must know about:

- Pothos lists `t.exposeID("id")`, `t.exposeString("title")`, and so on. The Zod objects list the same properties once, and `authorId` / `postId` stay private through `field.hidden`.
- Pothos `User.implement`, `Post.implement`, and `Comment.implement` reference each other through refs. GQLoom has no circular reference: relation fields live in `resolver.of` and refer to silks that only hold scalar properties.
- The Pothos resolvers return `Users.get(...)`, a possibly-undefined value, for nullable fields. The ported resolvers do the same, which is why outputs use `.nullish()`: it accepts `undefined` from the resolver and GraphQL prints `null`.
- `post.id`, `user.id`, `comment.id` print `ID`, as in Pothos 4, because `NullableID` is `GraphQLID` without `NonNull`. Query arguments print `ID!` because they use `ID`.

Verification of this port: `diff` of `printSchema(lexicographicSortSchema(schema))` is empty, and the following requests return identical JSON on both schemas using the same seeded data: `{ post(id: "2") { id title author { fullName posts { id } } comments { comment post { id } } } }`, `{ posts(take: 2, skip: 1) { id } user(id: "3") { fullName comments { id } } }`, `{ post(id: "999") { id } }`, and `{ post { id } }` (missing required argument).

## Cleanup

After every module passes the SDL diff and request replay:

1. Uninstall Pothos packages, the ones you actually have:

   ```sh
   npm uninstall @pothos/core @pothos/plugin-prisma @pothos/plugin-drizzle \
     @pothos/plugin-prisma-utils @pothos/plugin-scope-auth @pothos/plugin-dataloader \
     @pothos/plugin-relay @pothos/plugin-errors @pothos/plugin-sub-graph \
     @pothos/plugin-smart-subscriptions @pothos/plugin-zod @pothos/plugin-validation \
     @pothos/plugin-with-input @pothos/plugin-simple-objects @pothos/plugin-complexity \
     @pothos/plugin-federation dataloader
   ```

   Keep `dataloader` only if other code imports it. Run the equivalent `pnpm remove`, `yarn remove`, or `bun remove`.

2. Remove leftover generated files and config:

   - In `schema.prisma`, delete `generator pothos { provider = "prisma-pothos-types" ... }`, and delete the file at its `output` (for example `./generated.ts`). Without `output`, the types were written into `node_modules/@pothos/plugin-prisma/`, which disappears when you uninstall. Then run `npx prisma generate`.
   - Delete `builder.ts` and every `import { builder }` line.
   - Rewrite the example or package `README.md` so current docs no longer describe a Pothos API: change the title and the package list from `@pothos/core` to `@gqloom/core`, `@gqloom/zod`, `zod`, and replace its embedded SDL with the output of `printSchema(lexicographicSortSchema(schema))`. A README copied from a Pothos example often carries an older all-non-null SDL (Pothos 3 defaults); do not keep it.
   - If you copied a whole Pothos example directory, its `CHANGELOG.md` is historical and lists `@pothos/core` on every release. Delete it, or leave it and exclude it from the check below.
   - Delete the `PrismaTypes`, `DrizzleRelations`, `Context`, and `AuthScopes` generics that only fed `SchemaBuilder`.
   - Delete `before.graphql` after the last comparison, or keep it as a contract test.

3. Check that nothing is left. Run it from the repository root, so `README.md` and config files are searched and not only `src/`. Exclude only `node_modules`, lockfiles, and `CHANGELOG.md` (historical changelogs may still mention Pothos):

   ```sh
   rg -n -i "@pothos|SchemaBuilder|prisma-pothos-types|pothos" . \
     -g '!node_modules' -g '!CHANGELOG.md' \
     -g '!pnpm-lock.yaml' -g '!package-lock.json' -g '!yarn.lock' -g '!bun.lock'
   ```

   The command must print nothing. Any match in `README.md` means step 2 is not finished.

Related documentation:

- [Zod](../schema/zod.md): `.meta()`, `.describe()`, enums, unions, interfaces, `asObjectType` / `asField`
- [Resolver](../resolver.md): `resolver.of`, `query`, `mutation`, `subscription`, `field`
- [Middleware](../middleware.md): authentication and global middleware
- [Context](../context.md): `useContext` and `asyncContextProvider`
- [DataLoader](../dataloader.md): `field().load()`
- [Prisma](../schema/prisma.md) and [Drizzle](../schema/drizzle.md): silks and resolver factories
