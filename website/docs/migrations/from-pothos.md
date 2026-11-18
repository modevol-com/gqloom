# Migrating from Pothos

## Why GQLoom

Pothos builds a GraphQL schema through a `SchemaBuilder` instance. Every type is declared on the builder (`objectRef` + `implement`, `t.exposeX('field')`), and the backing TypeScript type is passed in as a generic. GQLoom weaves runtime schemas (such as Zod, Valibot, or Yup) and ORM models (such as Prisma, Drizzle, or MikroORM) into a GraphQL schema. It has no builder instance.

The numbers below come from porting the official Pothos [`examples/simple-interfaces`](https://github.com/hayes/pothos/tree/main/examples/simple-interfaces) (`@pothos/core` 4.18.0, `graphql` 16.14.2) to GQLoom. The port is in the [reference implementation](#reference-implementation).

| Measured on the same example | Pothos | GQLoom (Zod) |
| --- | --- | --- |
| Schema code files | `builder.ts` + `schema.ts`, 96 lines | `schema.ts`, 90 lines (includes the two ID helpers) |
| `SchemaBuilder` instance and its generic | 1 | 0 |
| `objectRef` + `.implement(...)` | 3 + 3 | 0 |
| `builder.queryType(...)` and `t.expose*('name')` string-keyed declarations | 1 and 8 | 0 (fields are the properties of `z.object`) |
| Places that declare the shape of `Post` | 3 (backing interface, `objectRef<IPost>`, `t.expose*` list) | 1 (`z.object`; `z.infer` gives the TypeScript type) |
| `printSchema(lexicographicSortSchema(schema))`, before vs. after | n/a | `diff` is empty |
| Replay of 4 queries (3 data queries, 1 validation error) | n/a | identical JSON, including the error text |
| Runtime packages in `package.json` | `@pothos/core` | `@gqloom/core`, `@gqloom/zod`, `zod` |

The port keeps the `IPost` interface so `data.ts` stays unchanged. You can delete it in favor of `z.infer<typeof Post>`.

On a schema this small the port is not shorter, and it adds `zod`. The savings come from removing plugins. After a full migration you can uninstall `@pothos/core` and every `@pothos/plugin-*` package, drop the `PrismaTypes` generic and the `prisma-pothos-types` generator, and stop keeping a second declaration of each model next to the Prisma schema or Drizzle table.

- One runtime schema or ORM model is the source of truth. TypeScript types are inferred from it, GraphQL types are woven from it, and it validates inputs, so `@pothos/plugin-zod` and `@pothos/plugin-validation` are not needed.
- Prisma, Drizzle, and MikroORM models work as silks directly. Resolver factories generate CRUD operations and relation fields.
- `field().load()` batches relation loads in place of `@pothos/plugin-dataloader`. There is no `loadableObject` declaration.
- Middleware and `useContext()` replace `@pothos/plugin-scope-auth` and the `context` argument of each resolver.

## Overview and mental model

In Pothos the builder is the schema: you register types on it and pass the backing TypeScript type as a generic. In GQLoom the Zod object (or ORM model) is the type, and `weave` collects the resolvers into a schema at the end.

| | Pothos | GQLoom |
| --- | --- | --- |
| Types | `objectRef` + `implement`, backing type as a generic | Zod / Valibot / ORM model (silk) |
| Exposed fields | Only those listed with `t.expose*` | Every property of the object; hide with `field.hidden` |
| Computed and relation fields | `t.field({ resolve })` inside the type | `resolver.of(Silk, { ... })` |
| Root operations | `builder.queryType`, `mutationType`, `subscriptionType` | `resolver({ ... })` with `query` / `mutation` / `subscription` |
| Schema | `builder.toSchema()` | `weave(ZodWeaver, ...resolvers)` |
| Nullability | Set by the builder (Pothos 4: nullable unless `defaultFieldNullability: false`) | Set by the Zod type (non-null unless `.nullish()`) |
| Validation | `@pothos/plugin-zod`, `@pothos/plugin-validation` | The schema itself |
| Auth / context | `authScopes`, `context` argument | `Middleware`, `useContext()` |
| N+1 | `@pothos/plugin-dataloader` | `field().load()` |

Where Pothos habits break:

- Nullability is the other way round. Pothos 4 prints nullable outputs and optional args by default, while a bare Zod type is non-null. Copy nullability from the printed SDL and write `.nullish()` for each nullable output and optional input (rule 2).
- A Zod object exposes every property. Foreign keys and password hashes that Pothos never exposed need `field.hidden`.
- Silks hold plain properties only. GQLoom has no circular reference between silks, so relation fields go in `resolver.of`.
- Input types and object types are separate silks, each with its own title.
- `useContext()` throws unless `weave` receives `asyncContextProvider`.

Migration recommendations:

- The examples use Zod (`@gqloom/zod`). If you already have Valibot schemas or Prisma, Drizzle, or MikroORM models, weave those directly instead of declaring each type a third time.
- Migrate module by module and keep `@pothos/core` installed meanwhile. Both `GraphQLSchema` instances can coexist: combine them with [`mergeSchemas`](https://the-guild.dev/graphql/tools/docs/schema-merging), or mount them on separate HTTP endpoints.
- Print the Pothos SDL before you change anything and diff it after every module (see [Verification](#verification)).

## Concept map (executable Pothos → GQLoom)

The builder below sets `defaultFieldNullability: false`, so unmarked Pothos fields are non-null, like Zod. The second block is the same schema in GQLoom. Both were built, and `printSchema(lexicographicSortSchema(schema))` of each was compared with `diff`: identical (59 lines of SDL).

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

Both builds print this SDL (excerpt):

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

The table covers what the code above does not show:

| Pothos | GQLoom |
| --- | --- |
| `new SchemaBuilder<Types>({ plugins })` | No builder. `weave(ZodWeaver, ...)` |
| `builder.toSchema()` | `weave(ZodWeaver, config, ...resolvers)` (add `asyncContextProvider` when `useContext()` is called) |
| `builder.objectType('X', { fields })`, `objectRef` + `implement` | `z.object({ ... }).meta({ title: "X" })` |
| `t.exposeString/Int/Float/Boolean('p')` | property of `z.object`: `z.string()`, `z.int()`, `z.number()`, `z.boolean()` |
| `t.exposeID('p')`, `t.arg.id()` | `ID` / `NullableID` helpers (rule 8) |
| `t.string/int/field({ resolve })` | `field(schema).resolve(parent => ...)` in `resolver.of` |
| `builder.objectFields(Ref, fields)` (extend a type from another module) | another `resolver.of(Silk, { ... })` |
| `nullable: true` / `nullable: { list, items }` | `.nullish()` / `z.array(X.nullish()).nullish()` |
| `required: true` on args and inputs | the bare Zod type; omit `required`, use `.nullish()` for optional |
| `t.arg.string/int/float/boolean/id/stringList/...` | Zod types inside `.input({ ... })` |
| `t.arg({ type: Input, required: true })` | `.input({ input: InputSilk })` |
| `builder.inputType`, `builder.inputRef` | separate `z.object` with `.meta({ title })` |
| `description` | `.describe()` or `.meta({ description })`; on operations and fields `.description()` |
| `deprecationReason` | `.deprecationReason()` |
| `builder.enumType('E', { values })` | `z.enum([...]).meta({ title: "E" })` |
| `builder.unionType` + `resolveType` | `z.discriminatedUnion("__typename", [...]).meta({ title })` |
| `builder.interfaceType` + `interfaces: [I]` | `asObjectType({ interfaces: [I] })` |
| `builder.scalarType`, `addScalarType` | `ZodWeaver.config({ presetGraphQLType })` or `asField({ type })` |
| `builder.queryField`, `builder.mutationField` | an entry in `resolver({ ... })` |
| `context` argument | `useContext<Ctx>()` |
| `info` argument | `useResolverPayload().info` |
| `@pothos/plugin-scope-auth` `authScopes` | `Middleware` with `.use()` |
| `@pothos/plugin-dataloader` | `field().load()` |
| `@pothos/plugin-zod`, `@pothos/plugin-validation` | the Zod schema itself |
| `@pothos/plugin-complexity` | `extensions: { complexity }` on the field (repository example: `examples/query-complexity`) |
| `@pothos/plugin-federation` | [Federation](../advanced/federation.md) |
| `@pothos/plugin-simple-objects` (`builder.simpleObject`) | `z.object` |
| `@pothos/plugin-with-input` (`t.fieldWithInput`) | `.input({ input: NamedInputSilk })`, name the input type yourself |
| `@pothos/plugin-prisma`, `@pothos/plugin-drizzle` | resolver factories and `relationField` (see below) |
| `@pothos/plugin-relay`, `-errors`, `-sub-graph`, `-smart-subscriptions` | stop (see [When to migrate, when to stop](#when-to-migrate-when-to-stop)) |

## Rules

Follow these rules if this page is all you have. Each one has its snippet further down.

1. MUST save the Pothos SDL before touching code: `printSchema(lexicographicSortSchema(builder.toSchema()))` written to `before.graphql`. The migration is done only when the GQLoom SDL has an empty `diff` and replayed requests return the same JSON.
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
13. MUST replace `builder.toSchema()` with `weave(ZodWeaver, config, ...resolvers)` (add `asyncContextProvider` only when rule 9 applies). A silk that no resolver can reach is not in the SDL.
14. MUST NOT return an interface silk from a query or field. Declare `asObjectType({ interfaces: [Iface] })` on the implementors and return a union.
15. MUST NOT hand-translate Relay (`builder.node`, `t.connection`), `@pothos/plugin-errors`, `@pothos/plugin-sub-graph`, or `@pothos/plugin-smart-subscriptions`. Stop and keep Pothos for that module.
16. MUST NOT uninstall any `@pothos/*` package or mix `builder` and GQLoom resolvers in one file until rule 1 passes for every module.

## When to migrate, when to stop

Migrate when:

- the schema is plain objects, enums, unions, inputs, and simple resolvers, and the `t.exposeX` and `objectRef` ceremony is the main cost;
- you already keep a Zod or Valibot schema, a Prisma model, or a Drizzle table for each type and Pothos is a third declaration;
- you use `@pothos/plugin-zod` or `@pothos/plugin-validation` only to validate arguments;
- you use `@pothos/plugin-scope-auth` for role checks that a middleware can express.

Stop and look at the architecture first if you depend on:

- Relay: `builder.node`, `t.connection`, `prismaConnection`, `drizzleConnection`, global IDs. GQLoom has no Relay helpers. You would hand-write the `Connection`, `Edge`, `PageInfo` types and cursor logic, and the SDL will differ.
- `@pothos/plugin-errors`, `@pothos/plugin-sub-graph`, `@pothos/plugin-smart-subscriptions`, and Pothos "variants" (`variant`, `Viewer` style prisma/drizzle variants). GQLoom has no equivalent for them.
- Fields whose declared type is a GraphQL interface (for example `node(id): Node`). GQLoom cannot return an interface silk from a field (see [Gotchas](#gotchas)), and a union changes the SDL.
- `@pothos/plugin-prisma-utils` or `@pothos/plugin-drizzle` generated filter and order inputs. The GQLoom resolver factories generate different input type names, so keep those operations hand-written until clients move.
- Query planning that the Pothos Prisma or Drizzle plugin does across nested selections (a single `include` tree). GQLoom batches per relation field. Measure query counts before and after.

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

Check query counts yourself before and after: enable `log: ["query"]` (Prisma) or `logger: true` (Drizzle) and compare the number of statements for the same request. With the ORM plugins, `relationField` replaces `t.relation`; do not assume it produces the same single joined query.

## Gotchas

Each item shows the wrong result that was observed, then the fix.

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

- Interface-typed fields. `query(Node)` where `Node` is also used in `asObjectType({ interfaces: [Node] })` fails with `Schema must contain uniquely named types but contains multiple types named "Node"`. Return a union of the implementors (`z.discriminatedUnion("__typename", [Dog, Cat])`) and tell clients to use inline fragments; the SDL changes, so treat it as a contract change.

- Validation: GQLoom validates arguments against the Zod schema before `resolve`. A failure rejects the request with `extensions.issues` (for example `{"message":"Invalid email address","extensions":{"issues":[...]}}`). Update clients that parse the error shape of `@pothos/plugin-zod` or `@pothos/plugin-validation`.

- `.optional()` inputs reject an explicit `null`. `z.int().optional()` prints `Int`, but `{ a(x: null) }` fails with `Invalid input: expected number, received null`, while Pothos `t.arg.int()` accepts it. Use `.nullish()` for every optional Pothos argument and input field.

  ```ts
  .input({ take: z.int().optional() }) // [!code --]
  .input({ take: z.int().nullish() }) // [!code ++]
  ```

## Verification

The migration must leave the SDL and the responses unchanged.

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

   The output must be empty. Fix the schema, not the file.

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

Differences from the Pothos version:

- Pothos lists `t.exposeID("id")`, `t.exposeString("title")`, and so on. The Zod objects list the same properties once, and `authorId` / `postId` stay private through `field.hidden`.
- Pothos `User.implement`, `Post.implement`, and `Comment.implement` reference each other through refs. GQLoom has no circular reference: relation fields live in `resolver.of` and refer to silks that only hold scalar properties.
- The Pothos resolvers return `Users.get(...)`, a possibly-undefined value, for nullable fields. The ported resolvers do the same, which is why outputs use `.nullish()`: it accepts `undefined` from the resolver and GraphQL prints `null`.
- `post.id`, `user.id`, `comment.id` print `ID`, as in Pothos 4, because `NullableID` is `GraphQLID` without `NonNull`. Query arguments print `ID!` because they use `ID`.

For this port, the `diff` of `printSchema(lexicographicSortSchema(schema))` is empty, and these requests return identical JSON on both schemas with the same seeded data: `{ post(id: "2") { id title author { fullName posts { id } } comments { comment post { id } } } }`, `{ posts(take: 2, skip: 1) { id } user(id: "3") { fullName comments { id } } }`, `{ post(id: "999") { id } }`, and `{ post { id } }` (missing required argument).

## Cleanup

After every module passes the SDL diff and request replay:

1. Uninstall Pothos packages, the ones you actually have:

   ```sh
   npm uninstall @pothos/core @pothos/plugin-prisma @pothos/plugin-drizzle \
     @pothos/plugin-scope-auth @pothos/plugin-dataloader @pothos/plugin-relay \
     @pothos/plugin-zod @pothos/plugin-validation @pothos/plugin-with-input \
     @pothos/plugin-simple-objects @pothos/plugin-complexity dataloader
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
