# Migrating from Nexus

## Why GQLoom

Both Nexus and GQLoom bring code-first GraphQL development to TypeScript without decorators, yet they are built on very different ideas.

Nexus puts the GraphQL schema layer first. You define API types and fields inside code DSL blocks, then rely on generated type declarations and source-type mappings to connect that GraphQL layer back to your data models, context, and resolvers.

GQLoom starts from the runtime schemas and ORM models your codebase already relies on. It weaves the GraphQL schema directly from them using pure TypeScript inference—keeping your data, business logic, and schema assembly cleanly separated.

- **Native TypeScript inference, zero codegen**

  Nexus achieves type safety by generating ambient declaration files whenever your schema changes and maintaining source-type mappings to bridge models and API types. GQLoom needs no generated type artifacts, background watch step, or string-matched type registry: TypeScript infers types directly from your schemas and resolvers as you edit, so your editor and build stay in sync immediately.

- **One source of truth across types, validation, and GraphQL**

  With Nexus, GraphQL type definitions, backing models, and input validation live apart and have to be aligned by hand. GQLoom turns your existing validation schemas and ORM models directly into GraphQL types—one definition drives static TypeScript types, automatic input validation, and the API contract together.

- **Plain, composable modules with built-in essentials**

  Instead of locking fields inside DSL callbacks coupled to a global schema registry, GQLoom keeps domain definitions and resolvers as plain TypeScript objects and functions assembled explicitly at the entry point. The same logic is easy to test or reuse outside GraphQL, while everyday needs like middleware, request context, and batching share one consistent core model.

When you are ready to leave codegen, parallel model layers, and DSL callbacks behind, every Nexus capability—including interfaces, Relay connections, field authorization, and custom plugins—has a direct GQLoom replacement, leaving you with a cleaner, single-source-of-truth TypeScript codebase with zero leftover debt.

## Overview and mental model

| | Nexus | GQLoom |
| --- | --- | --- |
| Types | `objectType` / `interfaceType`, `definition(t)` | Zod / Valibot / ORM models (silks) |
| Operations | `queryType` / `mutationType` / `subscriptionType` / `*Field` / `extendType` | `resolver({ ... })` and `resolver.of(Silk, { ... })` |
| Schema | `makeSchema({ types })` + `outputs` artifact generation | `weave(ZodWeaver, ...resolvers)` takes them explicitly, no codegen |
| Type safety | Generated `typegen` + `sourceTypes` / `contextType` config | Native TypeScript inference from schemas and `useContext<Ctx>()` |
| Validation | Manual or custom plugin | The schema itself; inputs are validated by default |
| Auth / Context | `fieldAuthorizePlugin` (`authorize`), `ctx` argument | Middleware (`.use()`), `useContext()` |

Migration recommendations:

- Use Zod (`@gqloom/zod`) by default. If your project already uses Valibot, or the data layer is backed by Prisma, Drizzle, or MikroORM, weave those existing schemas or models directly instead of duplicating them in `objectType` blocks.
- For large schemas, migrate incrementally by module during the transition: both `GraphQLSchema` instances can temporarily coexist and be combined with [`mergeSchemas`](https://the-guild.dev/graphql/tools/docs/schema-merging) or mounted on separate HTTP endpoints, then uninstall `nexus` and all Nexus plugins once every module is ported so no Nexus code or config remains.
- Keep object silks for data properties only, and define computed or relational fields in `resolver.of(Silk, { ... })`. Copy nullability from the printed Nexus SDL (using `.nullish()` for nullable outputs and optional inputs) rather than guessing, because Nexus defaults to nullable unless `nonNullDefaults` is enabled.

## Concept map

The table below highlights concepts and APIs with notable differences:

| Nexus | GQLoom | Notes |
| --- | --- | --- |
| `makeSchema({ types, plugins, outputs, contextType, sourceTypes })` | `weave(ZodWeaver, config, ...resolvers)` | Add `asyncContextProvider` when `useContext()` is called; no `typegen` or `sourceTypes` config; unreachable silks are omitted from the SDL |
| `objectType({ name, definition(t) { ... } })` | `z.object({ ... }).meta({ title })` | Put computed and relational fields in `resolver.of`, not on the silk |
| `t.string` / `t.int` / `t.float` / `t.boolean` (default resolver) | Properties of `z.object` | All properties are exposed by default; hide backing or private ones with `field.hidden` |
| `t.id` / `idArg()` | `asField({ type: GraphQLID })` (`NullableID`) / `new GraphQLNonNull(GraphQLID)` (`ID`) | `z.string()` prints `String`; pick helper from SDL (rule 8) |
| `t.field` / `t.string(..., { resolve })` | `resolver.of(Silk, { name: field(type).resolve((parent) => ...) })` | `parent` is the first argument of `resolve` |
| `extendType({ type: "User", definition })` | Another `resolver.of(User, { ... })` | Extend an object type from another module; `extendType` on `Query` or `Mutation` becomes `resolver({ ... })` |
| `inputObjectType({ name, definition })` | Separate `z.object({ ... }).meta({ title })` | Do not reuse an object silk as an input |
| `queryType` / `mutationType` / `subscriptionType` / `*Field` | `resolver({ ... })` with `query`, `mutation`, `subscription` | Subscriptions use `.subscribe(async function* ...)` |
| `args` (`stringArg`, `intArg`, `floatArg`, `booleanArg`, `idArg`, `arg`) | `.input({ ... })` | Arguments become one object |
| `nonNull(T)` / `t.nonNull.*` vs default / `nullable(T)` / `t.nullable.*` | Bare Zod type (`!`) vs `.nullish()` (nullable) | Nexus defaults `nonNullDefaults` to `false`; match the printed SDL |
| `declarativeWrappingPlugin` (`nullable`, `required`, `list`) | Bare Zod type, `.nullish()`, `z.array(...)` | Pick from the printed SDL |
| `list(T)` / `t.list.*` | `z.array(T)` | Combine `.nullish()` inside and outside `z.array` to match `[T!]`, `[T]`, `[T!]!`, `[T]!` |
| `enumType({ name, members })` | `z.enum([...]).meta({ title })` | For mapped enum values, use a TypeScript `enum` with `z.enum(TsEnum).meta({ title })` |
| `unionType({ name, definition, resolveType })` | `z.discriminatedUnion("__typename", [...]).meta({ title })` | Or `z.union` with `asUnionType` / `resolveType` |
| `interfaceType` + `t.implements(...)` + `t.modify(...)` | `silk(new GraphQLInterfaceType(...))` + `asObjectType({ interfaces: [I] })`, or `z.discriminatedUnion` | Shared `GraphQLInterfaceType` preserves interface-typed fields verbatim; see [Interfaces](#interfaces) |
| `scalarType` / `asNexusMethod` / `decorateType` | `ZodWeaver.config({ presetGraphQLType })` or `asField({ type })` | Map `Date` (`z.ZodDate`) globally in `presetGraphQLType` |
| `ctx` argument + `contextType` | [`useContext<Ctx>()`](../context.md) | Requires `asyncContextProvider` |
| `info` argument | `useResolverPayload().info` | |
| `fieldAuthorizePlugin` (`authorize`) | [Middleware](../middleware.md) with `.use()` | Operations use `.use()`, object fields use `field().use()` |
| `nullabilityGuardPlugin` (`fallbackValues`) | Global `Middleware` inspecting `payload.info.returnType` | See [Nullability guard and custom plugins](#nullability-guard-and-custom-plugins) |
| `queryComplexityPlugin` (`complexity`) | `extensions: { complexity }` | Repository example: `examples/query-complexity` |
| `connectionPlugin` (`t.connectionField`) | `PageInfo` / `*Edge` / `*Connection` silk helper | See [Relay connections](#relay-connections) |
| Custom `plugin(...)` (`onCreateFieldResolver`, dynamic methods) | `Middleware` and plain TypeScript field/object helpers | See [Nullability guard and custom plugins](#nullability-guard-and-custom-plugins) |
| `DataLoader` on `ctx` / data sources | [`field().load()`](../dataloader.md) | Pass `contextValue: {}` in tests |
| `nexus-prisma` / `nexus-plugin-prisma` (`t.model.*`, `t.crud.*`, `User.id`) | [Prisma](../schema/prisma.md) (`PrismaResolverFactory`, `relationField`) | See [Prisma plugin](#prisma-plugin) |

Common field options mapping:

- `description` → `z.describe()` or `z.meta({ description })` on silk properties (operations and fields use `.description()`)
- `deprecation` → `.deprecationReason()`
- `default` on args → `.default(...)` (see [Gotchas](#gotchas) for SDL output)
- Nullable outputs / optional args → `.nullish()` (`z.array(X.nullish()).nullish()` for `[X]`)
- `nonNull(...)` / `t.nonNull.*` (or `nonNullDefaults: true` fields) → bare Zod type (omit `.nullish()`)

Declare ordinary names and descriptions with `z.describe()` or `z.meta()`, and map global scalars such as `Date` once with `ZodWeaver.config({ presetGraphQLType })`. Use `asObjectType` and `asField` only when Zod metadata cannot express GraphQL-only configurations, such as interfaces (`asObjectType({ interfaces })`), `ID` scalars (`asField({ type })`), or extensions.

## Rules

A model that only reads this page must follow these rules. Each rule is repeated with its snippet later on.

1. MUST save the Nexus SDL before touching code: `printSchema(lexicographicSortSchema(schema))` written to `before.graphql`. Do not diff against Nexus's raw `outputs.schema` file without sorting it first. The migration is done only when the GQLoom SDL has an empty `diff` (or documented intentional SDL adjustments) and replayed requests return matching JSON.
2. MUST copy nullability from the printed SDL, never from memory. Nexus defaults `nonNullDefaults` to `{ input: false, output: false }`, so fields and args are nullable unless wrapped with `nonNull` or overridden by `nonNullDefaults: true` globally or per type. Port every nullable output and every optional input as `.nullish()` (one spelling; `.nullable()` makes TypeScript reject a resolver that returns `undefined`). Everything else is the bare Zod type.
3. MUST turn each Nexus `objectType` into one `z.object({ ... }).meta({ title: "Name" })`. Do not copy `definition(t)`, `sourceTypes`, `typegen` globals, or `NexusGen`.
4. MUST define every computed or relational field (including renamed `sourceTypes` mappings and `t.modify` overrides) with `resolver.of(Silk, { name: field(type).resolve((parent) => ...) })`. `parent` is the first argument of `resolve`; there is no `t` callback and no `ctx` argument.
5. MUST define every root field (`Query`, `Mutation`, `Subscription` — whether from `queryType`/`mutationType`/`subscriptionType`, `*Field`, or `extendType`) with `resolver({ name: query(...) | mutation(...) | subscription(...) })`. Arguments go through `.input({ ... })` only.
6. MUST hide every property of the Zod object (or Prisma model) that Nexus did not expose in `objectType` (such as foreign keys or internal `sourceTypes` fields), using `name: field.hidden` inside `resolver.of`. A Zod object exposes every property.
7. MUST declare `inputObjectType` as separate silks with their own `.meta({ title })`. MUST NOT use an object silk as an input.
8. MUST define ID helpers once: `ID` (`z.string().register(asField, { type: new GraphQLNonNull(GraphQLID) })`, prints `ID!`) and `NullableID` (`z.string().nullish().register(asField, { type: GraphQLID })`, prints `ID`, accepts omitted/null inputs; omit `.nullish()` if used strictly as an output backed by a non-null `string`). `z.string()` prints `String`, and `.nullish()` after `asField` does not undo `GraphQLNonNull`.
9. MUST pass `asyncContextProvider` to `weave` whenever any resolver or middleware calls `useContext<Context>()`; without it `useContext()` throws. If nothing calls `useContext()`, leave it out.
10. MUST turn each `fieldAuthorizePlugin` `authorize` check into a `Middleware`. On operations use `.use(guard)`; on an object property use `field(...).use(guard).resolve(...)` inside `resolver.of`. A guard on a query does not protect fields of the object it returns.
11. MUST map `scalarType`, `asNexusMethod`, `decorateType`, and `Date` to `ZodWeaver.config({ presetGraphQLType })`. String enums are `z.enum([...]).meta({ title })`; mapped-value enums use a TypeScript `enum` with `z.enum(TsEnum).meta({ title })`. Union members are `z.object` with a `__typename` literal, combined by `z.discriminatedUnion("__typename", [...]).meta({ title })`.
12. MUST replace `DataLoader` instances on `ctx` / data sources and N+1 relation resolvers with `field(...).load(...)` or `PrismaResolverFactory.relationField()`. In tests, execute with `contextValue: {}` or batching is disabled.
13. MUST replace `makeSchema({ types, plugins, outputs, contextType, sourceTypes })` with `weave(ZodWeaver, config, ...resolvers)` (add `asyncContextProvider` only when rule 9 applies). A silk that no resolver can reach is not in the SDL.
14. MUST migrate `interfaceType` and `t.implements(...)` with one of two explicit paths: (a) to keep the GraphQL `interface` and fields returning that interface (`query(Node)`) with an empty SDL diff, wrap one shared `GraphQLInterfaceType` in `silk(NodeInterface)` and pass it to both `query(Node)` and `asObjectType({ interfaces: [NodeInterface] })` (repeating interface fields on each implementor `z.object`); or (b) if converting an interface return type to `z.discriminatedUnion("__typename", [...])`, document `interface` → `union` as an intentional contract change and update client selections to inline fragments. MUST NOT pass a `z.object` silk to both `query(Iface)` and `asObjectType({ interfaces: [Iface] })`.
15. MUST migrate `connectionPlugin` (`t.connectionField`), `nullabilityGuardPlugin`, `queryComplexityPlugin`, and custom Nexus `plugin(...)` hooks completely to GQLoom equivalents (`PageInfo`/`*Edge`/`*Connection` silks, fallback `Middleware`, `extensions: { complexity }`, and plain TypeScript helpers) instead of leaving Nexus behind.
16. MUST finish migrating every module and uninstall `nexus`, `nexus-prisma`, and `nexus-plugin-prisma` (do not mix Nexus definitions and GQLoom resolvers in one file during transition, and leave zero Nexus dependencies, typegen files, or config behind).

## Migration practices

### Scaffold

Install the packages and delete the Nexus `makeSchema` module once all modules are ported:

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

Print the schema the same way you printed the Nexus one, and diff the two files after every module:

```ts
import { writeFileSync } from "node:fs"
import { lexicographicSortSchema, printSchema } from "graphql"
import { schema } from "./schema"

writeFileSync("after.graphql", printSchema(lexicographicSortSchema(schema)))
```

### Types

Each Nexus `objectType` becomes one Zod object. Name it with `.meta({ title })`, describe it with `.describe()` or `.meta({ description })`.

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

Nullability follows the printed SDL. Because Nexus supports both default nullable mode (`nonNullDefaults: false`) and opt-in non-null mode (`nonNullDefaults: { output: true, input: true }`) globally or per type, check the table against your printed SDL:

| Nexus (`nonNullDefaults: false`, default) | Nexus (`nonNullDefaults: true`) | SDL | Zod output / input |
| --- | --- | --- | --- |
| `t.string("x")` / `stringArg()` | `t.nullable.string("x")` / `nullable(stringArg())` | `String` | `z.string().nullish()` |
| `t.nonNull.string("x")` / `nonNull(stringArg())` | `t.string("x")` / `stringArg()` | `String!` | `z.string()` |
| `t.list.string("x")` / `list(stringArg())` | `t.nullable.list.nullable.string("x")` | `[String]` | `z.array(z.string().nullish()).nullish()` |
| `t.list.nonNull.string("x")` | `t.nullable.list.string("x")` | `[String!]` | `z.array(z.string()).nullish()` |
| `t.nonNull.list.string("x")` | `t.list.nullable.string("x")` | `[String]!` | `z.array(z.string().nullish())` |
| `t.nonNull.list.nonNull.string("x")` | `t.list.string("x")` | `[String!]!` | `z.array(z.string())` |

Tightening a nullable field later is a deliberate schema change; do it after the diff is empty, not during the port.

Nexus only exposes what you declare inside `definition(t)`, and uses `sourceTypes` for backing model fields. A Zod object exposes every property, so hide the properties Nexus kept internal (foreign keys, `snake_case` columns, password hashes) in `resolver.of`:

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

Separate `inputObjectType` definitions become separate silks named with `.meta({ title })`. Mapped enums (`enumType({ name, members: { ... } })`) and unions (`unionType`) map directly to `z.enum` and `z.discriminatedUnion`:

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

### Resolvers

Root fields (`queryType`, `mutationType`, `subscriptionType`, `queryField`, `mutationField`, `subscriptionField`, `extendType({ type: "Query" | "Mutation" })`) go in `resolver`. Object fields and `extendType({ type: "User" })` go in `resolver.of`. Arguments are one object passed to `.input`.

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

Nexus `subscriptionType` / `subscriptionField` pairs `subscribe()` with a `resolve(eventData)` step. In GQLoom, yield the final payload directly from `.subscribe(async function* ...)` (or chain `.resolve((payload) => ...)` only if transforming an event stream such as a PubSub payload):

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

Do not put `resolve` logic inside `z.object`. If Nexus remapped a backing property (for example `t.string("homePlanet", { resolve: (o) => o.home_planet })`), hide `home_planet: field.hidden` and define `homePlanet` in `resolver.of`.

### Interfaces

In Nexus, `interfaceType` defines shared fields once, `t.implements("Node")` copies them onto implementing `objectType`s automatically (with optional `t.modify` overrides), and queries or fields can return the interface directly (`node(id: ID!): Node`).

To preserve the exact SDL with zero client changes, define one `GraphQLInterfaceType` instance, wrap it with `silk()`, and pass the same `GraphQLInterfaceType` (or silk) to both `query(Node)` and `asObjectType({ interfaces: [NodeInterface] })`. Implementors repeat the interface fields in `z.object`, and any Nexus `t.modify` overrides become explicit `field(...).resolve(...)` entries in `resolver.of`:

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
  // Cast avoids Zod v4 registry `$replace` stripping private members on GraphQLInterfaceType
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

If you prefer pure Zod schemas without `GraphQLInterfaceType` and are willing to update the contract on an interface-returning field, convert that field's return type to `z.discriminatedUnion("__typename", [Human, Droid]).meta({ title: "Character" })` instead of returning an interface silk. **What changes in the SDL and how clients adapt**: `interface Character` becomes `union Character = Droid | Human`; clients can no longer select shared fields directly on the root selection (`hero { id name }`) and must move them into inline fragments (`hero { ... on Human { id name } ... on Droid { id name } }`).

### Relay connections

Nexus `connectionPlugin` (`t.connectionField`) generates a `PageInfo` type, a `<Name>Edge` type, a `<Name>Connection` type, and forward/backward cursor arguments (`first`, `after`, `last`, `before`). Replace it cleanly in GQLoom with a reusable `connectionSilks` helper and standard cursor pagination (such as `connectionFromArray` from `graphql-relay` or a database cursor query):

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

How to preserve Nexus connection options and handle SDL differences:

- `includeNodesField: true`: add `nodes: z.array(nodeSilk.nullish()).nullish()` to `Connection`.
- `extendConnection` / `extendEdge`: add custom fields directly to the `Connection` / `Edge` silk or attach computed fields via `resolver.of(Connection, { ... })`.
- `disableForwardPagination` / `disableBackwardPagination`: omit `first` / `after` or `last` / `before` from `.input({ ... })` so the argument list matches.
- **What changes in the SDL if Nexus used per-field connection names**: when Nexus `t.connectionField` had per-field `extendConnection` or `extendEdge` overrides, Nexus generated field-scoped type names such as `QueryUsers_Connection` and `QueryUsers_Edge`. Either pass `"QueryUsers_"` as the `prefix` to `connectionSilks` to keep the SDL identical, or standardize on `UserConnection` / `UserEdge` and update client GraphQL fragments or generated operation types that reference `QueryUsers_Connection`.

### Auth and context

Nexus reads context from the third argument of every resolver and relies on `contextType` in `makeSchema` for static typing. GQLoom reads it with `useContext<Ctx>()`, inferred directly without `contextType` or `typegen`, and the HTTP server creates context the same way.

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

Each `fieldAuthorizePlugin` `authorize` check becomes a middleware:

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

If Nexus defined `authorize` on an `objectType` field, move it to `field(...).use(guard)` inside `resolver.of`; properties that exist only on the silk run no middleware.

### Nullability guard and custom plugins

`nullabilityGuardPlugin` prevents unexpected `null` return values from bubbling errors on non-null fields by substituting fallback values per GraphQL type. Migrate it completely as a global GQLoom `Middleware` passed to `weave`, preserving the exact SDL and runtime fallback behavior:

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

Other Nexus plugin patterns map directly without a plugin system:

- `queryComplexityPlugin` (`complexity`): declare static or dynamic costs with `asField({ extensions: { complexity: 2 } })` on silk fields or `.extensions({ complexity: ({ args, childComplexity }) => ... })` on operations, and keep `graphql-query-complexity` in your server validation rules (see `examples/query-complexity` in the repository).
- Custom `onCreateFieldResolver` plugins (logging, timing, error reporting): write a `Middleware` and attach it with `.use(...)` or pass it globally to `weave(...)`.
- Custom `onObjectDefinition` / `dynamicOutputMethod` / `dynamicInputMethod` helpers (such as shared `createdAt` / `updatedAt` fields): export plain TypeScript field records (`const timestamps = { createdAt: z.date(), updatedAt: z.date() }`) and spread them into `z.object({ ...timestamps, ... })` or shared resolver-factory functions.

### Prisma plugin

Both `nexus-plugin-prisma` (`t.model.*`, `t.crud.*`) and `nexus-prisma` (`generator nexusPrisma`, `t.field(User.id)`) project Prisma models into Nexus `objectType` definitions. In GQLoom, the Prisma generator creates silks directly: no `objectType` projection, no `sourceTypes`, and no `nexusPrisma()` plugin. Replace the `nexusPrisma` generator block with the GQLoom generator and run `npx prisma generate`:

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

Hide columns with `field.hidden` (for example `password: field.hidden`) rather than omitting them from `definition(t)`. By default `@gqloom/prisma` emits `@id` fields as `ID`; if your Nexus schema exposed `@id` as `Int` or `String`, configure `PrismaWeaver.config({ emitIdAsIDType: false })`.

Migrating `nexus-plugin-prisma` `t.crud.*` and `computedInputs`:

- Preserve query and mutation field names (`user`, `users`, `createOneUser`) by binding `userFactory.findUniqueQuery()`, `findManyQuery()`, and `createMutation()` under those exact property keys inside `resolver.of(User, { ... })` (see [Prisma](../schema/prisma.md#resolver-factory)).
- Replace `computedInputs` with `.use(async ({ parseInput, next }) => ...)` middleware or `.input(...).transform(...)` so derived fields (like `authorId` from `useContext()`) are injected on the server without exposing them in the GraphQL input type.
- **What changes in the SDL and how clients adapt**: `nexus-plugin-prisma` `t.crud.*` generates its own filter/order/pagination and nested-write types (`UserOrderByInput`, `UserFilter`, `after`/`before`/`first`/`last` cursor args on `users` and relation fields, `CreateManyWithout...Input`), whereas `PrismaResolverFactory` generates Prisma DMMF input types (`orderBy: [UserOrderByWithRelationInput!]`, `skip`/`take`/`cursor` pagination, `*CreateNested*Input`) and `relationField()` returns the relation list without cursor arguments. Either update client queries and codegen types to the `PrismaResolverFactory` input contract during the cutover, or pass a custom `.input(LegacyInputSilk.transform(...))` adapter on `findManyQuery()` / `createMutation()` (and use `field(...).input(...).load(...)` on paginated relation fields) to keep existing client queries unchanged.

### N+1

Nexus projects commonly attach `DataLoader` instances to `ctx` or request-scoped data sources. In GQLoom, put `.load()` directly on the field. The loader receives all parents of one tick and must return one result per parent in the same order.

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

Batching is keyed by the request context object. Servers such as Yoga always provide one; in unit tests pass `contextValue: {}` to `graphql()` or batching will not run across items.

## Gotchas

Each item shows the wrong result that was observed and the fix.

- Nullability: Nexus defaults `nonNullDefaults` to `{ output: false, input: false }`, so `t.string("title")` prints `title: String`. Writing `title: z.string()` prints `String!`, changing error propagation. Writing `z.string().nullable()` prints `String` but fails type-checking when a resolver returns `undefined`: `Type 'IUser | undefined' is not assignable to type 'MayPromise<... | null>'`.

  ```ts
  const Post = z.object({ title: z.string() }).meta({ title: "Post" }) // [!code --]
  const Post = z.object({ title: z.string().nullish() }).meta({ title: "Post" }) // [!code ++]
  ```

- List and item nullability (`t.list.string` vs `[String]`): In Nexus's default `nonNullDefaults: false`, `t.list.string("tags")` prints `[String]` (nullable list of nullable items). Writing `z.array(z.string()).nullish()` prints `[String!]`; use `.nullish()` on both the item and the array:

  ```ts
  tags: z.array(z.string()).nullish() // prints [String!] // [!code --]
  tags: z.array(z.string().nullish()).nullish() // prints [String] // [!code ++]
  ```

- Every property is exposed: Nexus only exposes fields declared inside `definition(t)`. A Zod object exposes every property, so without `field.hidden`, foreign keys or `sourceTypes` fields leak into the SDL:

  ```ts
  const commentFields = resolver.of(Comment, {
    authorId: field.hidden, // [!code ++]
    postId: field.hidden, // [!code ++]
    author: field(User.nullish()).resolve((comment) => Users.get(comment.authorId)),
  })
  ```

- ID scalars: `z.string()` prints `String`. `asField({ type })` replaces the GraphQL type and drops `!`, and `ID.nullish()` after `asField` still prints `ID!`. Use the helpers from rule 8 and pick by SDL:

  ```ts
  const id = z.string() // prints String // [!code --]
  const ID = z.string().register(asField, { type: new GraphQLNonNull(GraphQLID) }) // ID! // [!code ++]
  const NullableID = z.string().nullish().register(asField, { type: GraphQLID }) // ID // [!code ++]
  ```

- Dates: `z.date()` prints `String`. Map `z.ZodDate` once in `ZodWeaver.config({ presetGraphQLType })` using the exact scalar name your Nexus schema used (for example `DateTime` or `Date`) and pass the config to `weave`.

- Input and object types are different types. Using one silk for both fails at `weave` with `Schema must contain uniquely named types but contains multiple types named "P"`.

  ```ts
  mk: mutation(P).input({ p: P }) // [!code --]
  mk: mutation(P).input({ p: PInput }) // [!code ++]
  ```

- `useContext()` without `asyncContextProvider` throws `Cannot read properties of undefined` at the first resolver that calls it:

  ```ts
  weave(ZodWeaver, rootResolver) // [!code --]
  weave(ZodWeaver, asyncContextProvider, rootResolver) // [!code ++]
  ```

- A middleware on an operation protects that operation only. Properties on the returned object run no middleware unless declared as fields in `resolver.of`, leaving the same property unprotected via other queries or relations. Move Nexus object-field `authorize` checks to `field().use(...)` inside `resolver.of`:

  ```ts
  const secretFields = resolver.of(Sec, {
    secret: field(z.string()).use(adminOnly).resolve((sec) => sec.secret), // [!code ++]
  })
  ```

  Note also that `fieldAuthorizePlugin` throws `new Error("Not authorized")` by default (`defaultFormatError`), so adjust assertions if your middleware throws `GraphQLError` or a custom error shape.

- Interface-typed fields and `t.implements`: Passing a `z.object` silk to both `query(Node)` and `asObjectType({ interfaces: [Node] })` fails with `Schema must contain uniquely named types but contains multiple types named "Node"`. Wrap a shared `GraphQLInterfaceType` in `silk(NodeInterface)` (zero SDL diff) or convert the interface field to `z.discriminatedUnion("__typename", [...])` and update client queries to inline fragments (see [Interfaces](#interfaces)). Also remember that unlike Nexus `t.implements(...)`, implementor `z.object` schemas must declare the interface's fields explicitly.

- Argument `default` in SDL and explicit `null`: Nexus `stringArg({ default: "World" })` prints `String = "World"` in SDL and forwards `null` if the client explicitly sends `null`. In GQLoom, `z.string().nullish().default("World")` omits `= "World"` from the SDL while preserving the runtime fallback on `undefined` and accepting `null`. Update any SDL snapshot assertions or client codegen expectations that check for `= "World"` in the SDL text.

- `.optional()` inputs reject an explicit `null`: `z.int().optional()` prints `Int`, yet `{ posts(take: null) }` fails with `Invalid input: expected number, received null`, whereas Nexus `intArg()` accepts `null`. Always use `.nullish()` for optional Nexus arguments and input fields:

  ```ts
  .input({ take: z.int().optional() }) // [!code --]
  .input({ take: z.int().nullish() }) // [!code ++]
  ```

- Input validation errors: Nexus does not perform schema-level validation beyond GraphQL scalar and input-object types unless you wrote custom logic. GQLoom validates arguments against the Zod schema before `resolve` and rejects invalid inputs with `extensions.issues`.

## Verification

The goal of migration is an unchanged contract and unchanged behavior (or explicitly documented SDL changes where opted into).

1. Before any change, print the Nexus SDL (avoid comparing Nexus's raw `outputs.schema` file directly, because its banner comment and unsorted type order create noisy diffs):

   ```ts
   import { writeFileSync } from "node:fs"
   import { lexicographicSortSchema, printSchema } from "graphql"
   import { schema } from "./schema"

   writeFileSync("before.graphql", printSchema(lexicographicSortSchema(schema)))
   ```

2. After each module, print the GQLoom SDL with the same call (see [Scaffold](#scaffold)) and compare:

   ```sh
   diff before.graphql after.graphql
   ```

   The output must be empty unless you intentionally opted into a documented contract update (such as switching an interface field to a union or switching `t.crud.*` to Prisma DMMF inputs). Fix the schema, not the file.

3. Replay requests against both schemas and compare the JSON:

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

   Replay the queries, mutations, and subscriptions your clients really send, including one request with a missing required argument so the GraphQL validation error matches as well. Authorization errors or newly enforced Zod validation errors will differ in `extensions` (see [Gotchas](#gotchas)); update those assertions deliberately.

## Reference implementation

The following ports the in-memory blog API from the official Nexus [Getting Started tutorial](https://github.com/graphql-nexus/nexus/blob/main/docs/content/010-getting-started/03-tutorial/04-chapter-3-adding-mutations-to-your-api.mdx) (`db.ts` + `Post.ts` + `schema.ts`). `db.ts` is unchanged (keeping the `Post` and `Db` interfaces and initial data), `nexus-typegen.ts` is deleted, and `server.ts` only updates its `schema` import if the path changes.

Notice how Nexus's default `nonNullDefaults: false` makes every field on `Post` nullable (`Int`, `String`, `Boolean`) and makes `t.list.field("drafts", { type: "Post" })` emit `[Post]` (nullable list of nullable `Post`). The port matches the exact SDL printed by `nexus`:

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

Differences you must know about:

- Nexus configures `contextType` via file path and emits `nexus-typegen.ts` + `schema.graphql` on startup. GQLoom takes `asyncContextProvider` in `weave` and infers `useContext<Context>()` directly from TypeScript.
- `PostQuery` and `PostMutation` used `extendType({ type: "Query" | "Mutation" })` in Nexus; in GQLoom all root operations sit together in `resolver({ ... })`.
- `t.list.field("drafts", { type: "Post" })` emits `[Post]` (both list and items nullable), which maps to `z.array(Post.nullish()).nullish()`, while `t.nonNull.field("createDraft", { type: "Post" })` emits `Post!` (`mutation(Post)`).

Verification of this port: `diff` of `printSchema(lexicographicSortSchema(schema))` is empty, and replaying `{ drafts { id title body published } }`, `mutation { createDraft(title: "GQLoom", body: "Weave") { id title body published } }`, `mutation { publish(draftId: 2) { id title body published } }`, `{ posts { id title body published } }`, and `mutation { createDraft(title: "MissingBody") { id } }` (missing required argument) returns identical JSON on both schemas with the same seeded `db`.

## Cleanup

After every module passes the SDL diff and request replay:

1. Uninstall Nexus packages, the ones you actually have:

   ```sh
   npm uninstall nexus nexus-prisma nexus-plugin-prisma
   ```

   Keep `graphql`. Run the equivalent `pnpm remove`, `yarn remove`, or `bun remove`.

2. Remove leftover generated files and config:

   - Delete the generated `typegen` and `schema` artifact files configured in `makeSchema`'s `outputs` (such as `nexus-typegen.ts`, `src/generated/nexus.ts`, `node_modules/@types/nexus-typegen/`, `node_modules/@types/typegen-nexus/`, and any Nexus-only `schema.graphql`).
   - In `prisma/schema.prisma`, delete `generator nexusPrisma { provider = "nexus-prisma" ... }`, delete any `nexus-prisma.ts` / `nexusPrisma.ts` config and its generated output folder, then run `npx prisma generate`.
   - Delete `makeSchema` options (`sourceTypes`, `contextType`, `outputs`, `shouldGenerateArtifacts`, `nonNullDefaults`), `/// <reference path="...typegen.ts" />` comments, and any `NexusGen*` ambient type references.
   - Update `package.json` scripts to remove Nexus artifact-generation steps (such as running `api/schema` before `tsc` or tests, or `--ignore-watch` flags for typegen files).
   - Rewrite the example or package `README.md` so current docs no longer describe a Nexus API: update titles and package lists from `nexus` to `@gqloom/core`, `@gqloom/zod`, `zod`, and replace embedded SDLs with the output of `printSchema(lexicographicSortSchema(schema))`.
   - If you copied a whole Nexus example directory, delete or exclude its historical `CHANGELOG.md` from the check below.
   - Delete `before.graphql` after the last comparison, or keep it as a contract test.

3. Check that nothing is left. Run it from the repository root, so `README.md` and config files are searched and not only `src/`. Exclude only `node_modules`, lockfiles, and `CHANGELOG.md` (historical changelogs may still mention Nexus):

   ```sh
   rg -n -i "nexus-prisma|nexus-plugin-prisma|nexus-typegen|NexusGen|makeSchema|objectType|inputObjectType|fieldAuthorizePlugin|nexus" . \
     -g '!node_modules' -g '!CHANGELOG.md' \
     -g '!pnpm-lock.yaml' -g '!package-lock.json' -g '!yarn.lock' -g '!bun.lock'
   ```

   The command must print nothing. Any match in `README.md` or `package.json` means step 2 is not finished.

Related documentation:

- [Zod](../schema/zod.md): `.meta()`, `.describe()`, enums, unions, interfaces, `asObjectType` / `asField`
- [Resolver](../resolver.md): `resolver.of`, `query`, `mutation`, `subscription`, `field`
- [Middleware](../middleware.md): authentication and global middleware
- [Context](../context.md): `useContext` and `asyncContextProvider`
- [DataLoader](../dataloader.md): `field().load()`
- [Prisma](../schema/prisma.md) and [Drizzle](../schema/drizzle.md): silks and resolver factories
