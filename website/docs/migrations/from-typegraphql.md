# Migrating from TypeGraphQL

TypeGraphQL describes a GraphQL schema with classes and decorators. GQLoom weaves the runtime schemas you already have — [Zod](https://zod.dev/) by default — into a GraphQL schema. Both are code-first. The skeleton is not: there is no `reflect-metadata`, no global metadata store, and no built-in IoC container.

This guide covers **the parts that are easy to guess wrong**. For GQLoom APIs, see [Silk](../silk.md), [Resolver](../resolver.md), [Weave](../weave.md), [Context](../context.md), and [Middleware](../middleware.md).

## Overview and mental model

| | TypeGraphQL | GQLoom |
| --- | --- | --- |
| Types | `@ObjectType` classes | Zod / Valibot / ORM models (silks) |
| Operations | `@Resolver` classes | `resolver({ ... })` objects |
| Schema | `buildSchema({ resolvers })` scans global metadata | `weave(ZodWeaver, ...resolvers)` takes them explicitly |
| Validation | Optional `class-validator` | The schema itself; inputs are validated by default |
| Auth / DI | `@Authorized`, `container` | Middleware, `useContext()` |

**Defaults:**

- Use **Zod** (`@gqloom/zod`). If the project already uses Valibot, or the source of truth is Prisma / Drizzle / Mikro, weave those types instead of copying another DTO layer.
- Migrate module by module. Do not uninstall `type-graphql` first. Keep both `GraphQLSchema` instances and combine them with [`mergeSchemas`](https://the-guild.dev/graphql/tools/docs/schema-merging), or serve two HTTP paths for a while.

Queries and mutations stay separate in GQLoom. Do not fold them into a single handler.

## Concept map

Only the mappings that are **not a straight rename**:

| TypeGraphQL | GQLoom | Notes |
| --- | --- | --- |
| `@ObjectType` / `@Field` | `z.object()`, plus `asObjectType` / `asField` when needed | Put computed fields on `resolver.of`, not on the silk |
| `@InputType` / `@ArgsType` | A separate input silk | Do not reuse the object silk |
| `@Resolver` + `@Query` / `@Mutation` | `resolver` + `query` / `mutation` | |
| `@FieldResolver` + `@Root` | `resolver.of(Type, { field })` | Parent is the first argument of `resolve` |
| `@Arg` / `@Args` | `.input({ ... })` | Arguments become one object |
| `@Ctx` | [`useContext()`](../context.md) | Requires `asyncContextProvider` |
| `@Info` | `useResolverPayload().info` | |
| `@Authorized` + `authChecker` | [Middleware](../middleware.md) | No built-in role checker |
| `@UseMiddleware` | `.use()` or `weave(..., middleware)` | Koa-style onion |
| `container` / constructor injection | Context or a module-level provider | **No TypeDI** |
| `class-validator` | Zod rules | See validation below |
| `emitSchemaFile` | `printSchema(lexicographicSortSchema(schema))` | See [Printing Schema](../advanced/printing-schema.md) |
| `registerEnumType` | `z.enum` + `asEnumType` | |
| `createUnionType` | `z.union` + `asUnionType` / `resolveType` | |
| `@InterfaceType` | `asObjectType({ interfaces })` | |
| `@Directive` / `@Extensions` | `extensions` (Federation: [Federation](../advanced/federation.md)) | |
| `complexity` | `extensions.complexity` | |
| `DataLoader` | [`field().load()`](../dataloader.md) | |
| `orphanedTypes` | Pass unused silks into `weave` | |

Common field options:

- `description` → `.description()` or `asField` / Zod `.meta({ description })`
- `deprecationReason` → `.deprecationReason()`
- `nullable: true` → `.nullish()` (see [Gotchas](#gotchas))
- `defaultValue` → Zod `.default(...)`

## Migration practices

### Scaffold

Install `graphql`, `@gqloom/core`, `zod`, `@gqloom/zod`, and whichever Yoga / Apollo adapter you already use. New files do not need `experimentalDecorators`.

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

To match TypeGraphQL's `DateTimeISO` scalar, map `z.date()` with `ZodWeaver.config` and [`GraphQLDateTimeISO`](https://the-guild.dev/graphql/scalars) (its SDL name is `DateTimeISO`):

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

Pass `zodWeaverConfig` into `weave`. For HTTP wiring, see [Adapters](../advanced/adapters/).

### Types and resolvers

Name objects with `__typename` or `asObjectType`. Give inputs their own silk and an explicit name. Put queries, mutations, and computed fields on `resolver` / `resolver.of`. The [reference implementation](#reference-implementation) is a full Recipe port.

### Auth and context

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

Attach it with `.use(authGuard("ADMIN"))` on one operation, or pass it to `weave` as global middleware.

Move constructor-injected services onto context or a module-level provider. Do not `new Service()` inside `resolve` unless the service was already stateless.

### ORMs

If you already use Prisma, Drizzle, or Mikro, weave the models and let the resolver factory build CRUD instead of translating `@Entity` + `@ObjectType` into Zod. See [Prisma](../schema/prisma.md#resolver-factory), [Drizzle](../schema/drizzle.md#resolver-factory), and [MikroORM](../schema/mikro-orm.md#resolver-factory).

For N+1 on relations, use [`field().load()`](../dataloader.md) instead of a hand-rolled DataLoader class.

## Gotchas

**Keep object and input silks separate.** GraphQL forbids using the same type as both output and input. TypeGraphQL uses `@ObjectType` and `@InputType`; GQLoom uses two silks.

**Do not map `nullable: true` to `.optional()`.**

| TypeGraphQL | GraphQL | Zod |
| --- | --- | --- |
| `@Field() title: string` | `String!` | `z.string()` |
| `@Field({ nullable: true }) description?: string` | `String` | `z.string().nullish()` |

`.optional()` means the property may be missing. It does not mean GraphQL `null`. For `nullable: true`, use `.nullish()` or `.nullable()`.

**GQLoom validates inputs.** TypeGraphQL can run with `validate: false`. After migration, arguments that fail Zod never reach `resolve`. If you relied on receiving dirty input, relax the schema or accept the new behavior.

The error shape changes too: `class-validator` used `ArgumentValidationError`; GQLoom surfaces schema issues. Clients that read `extensions.validationErrors` need an update.

**`useContext()` needs `asyncContextProvider`.** Without it, context is empty. On runtimes without `AsyncLocalStorage` (some Edge / browser setups), use [`useResolverPayload().context`](../context.md#access-to-resolver-payload-directly).

**`z.date()` is not `DateTimeISO` by default.** GQLoom weaves it to `String`. Map the scalar explicitly to match TypeGraphQL 2.

**`.default()` on an argument may not print as GraphQL `= 0`.** The default is applied when parsing; the SDL argument can still be nullable.

## When to stop

Do not invent equivalents for these. Pause and inspect the architecture:

- **NestJS + TypeGraphQL**, or `@nestjs/graphql` code-first. That is a different decorator and DI runtime.
- **Request-scoped IoC** (`using-scoped-container`, per-request `container.get`). GQLoom has no container lifecycle.
- **Generic resolvers, deep class inheritance, mixins.** Flatten them into plain `resolver` objects; if that is not feasible, migrate by hand.
- **Custom parameter decorators** (`createParameterDecorator`). Rewrite as `useContext` or `.input()`. If the semantics are unclear, stop.

`simpleResolvers` can usually be ignored. For federation, subscriptions, and custom scalars, see [Federation](../advanced/federation.md), [Subscription](../advanced/subscription.md), and [custom Zod mappings](../schema/zod.md#customize-type-mappings).

## Verification

You are migrating the contract, not the classes.

1. Freeze SDL from TypeGraphQL (`emitSchemaFile` or `printSchema`).
2. Print the GQLoom schema the same way:

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

3. Diff type names, fields, arguments, nullability, and enum values. Match descriptions and deprecations if you care about docs parity.
4. Replay the original queries, mutations, and subscriptions, and check `data`. Treat validation and authorization errors against [the new shapes above](#gotchas), not as a byte-for-byte copy of TypeGraphQL.

When every module is migrated and SDL plus requests are stable, uninstall `type-graphql`, `reflect-metadata`, and `class-validator`, and drop `experimentalDecorators` / `emitDecoratorMetadata`.

## Reference implementation

This is TypeGraphQL's official `simple-usage` Recipe, ported to GQLoom. Computed fields (`specification`, `averageRating`, `ratingsCount`) live on `resolver.of`, not on the silk.

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

Compared with TypeGraphQL's official SDL, `minRate` weaves as a nullable argument: `.default(0)` fills the value at parse time and does not always become GraphQL `Int! = 0`. Field set, nullability of the main types, and the `DateTimeISO` scalar do match.

Read next:

- [Zod](../schema/zod.md) — enums, unions, interfaces, `asField`
- [Resolver](../resolver.md) — `resolver.of`, `query` / `mutation` / `field`
- [Middleware](../middleware.md) — auth, logging, output validation
- [Context](../context.md) — `useContext`, `asyncContextProvider`
- [DataLoader](../dataloader.md) — `field().load()`
