# Migrating from TypeGraphQL

## Why GQLoom

TypeGraphQL uses classes, decorators, and `reflect-metadata`. GQLoom weaves runtime schemas (such as Zod, Valibot, or Yup) and ORM models (such as Prisma, Drizzle, or MikroORM) into GraphQL schemas.

- One runtime schema or ORM model as the single source of truth instead of maintaining separate GraphQL classes, TypeScript types, and `class-validator` decorators. TypeScript types are inferred from the schema, GraphQL types are woven from it, and runtime input validation is executed by the schema itself.
- Less boilerplate: you do not write `@ObjectType` classes, field decorators, and a parallel TypeScript type layer, as validation is built into the schema.
- You drop `reflect-metadata`, `experimentalDecorators`, `emitDecoratorMetadata`, global metadata registries, and built-in IoC containers (such as TypeDI). After full migration, you can uninstall `type-graphql`, `reflect-metadata`, and `class-validator`, and turn off decorator compiler flags in `tsconfig.json`.
- Direct reuse of Prisma, Drizzle, and MikroORM models as silks, with resolver factories generating standard CRUD operations without manual DTO classes.
- `field().load()` batches relational N+1 queries without custom DataLoader classes.
- Middleware and `useContext()` replace `@Authorized` decorators and constructor injection. Subscriptions and Apollo Federation work without decorators or code generation.

## Overview and mental model

| | TypeGraphQL | GQLoom |
| --- | --- | --- |
| Types | `@ObjectType` classes | Zod / Valibot / ORM models (silks) |
| Operations | `@Resolver` classes | `resolver({ ... })` objects |
| Schema | `buildSchema({ resolvers })` scans global metadata | `weave(ZodWeaver, ...resolvers)` takes them explicitly |
| Validation | Optional `class-validator` | The schema itself; inputs are validated by default |
| Auth / DI | `@Authorized`, `container` | Middleware, `useContext()` |

Migration recommendations:

- Use Zod (`@gqloom/zod`) by default. If your project already uses Valibot, or the data layer is backed by Prisma, Drizzle, or MikroORM, weave those existing schemas or models directly instead of defining duplicate DTOs.
- Migrate incrementally by module. Keep `type-graphql` installed during migration. Both `GraphQLSchema` instances can coexist and be combined with [`mergeSchemas`](https://the-guild.dev/graphql/tools/docs/schema-merging), or mounted on separate HTTP endpoints.
- Queries and mutations remain separate definitions in GQLoom. Do not combine them into a single handler.

## Concept map

The table below highlights concepts and APIs with notable differences:

| TypeGraphQL | GQLoom | Notes |
| --- | --- | --- |
| `@ObjectType` / `@Field` | `z.object()`, names via `__typename` or `z.meta({ title })`, descriptions via `z.describe()` or `z.meta({ description })` | Put computed fields on `resolver.of`, not on the silk |
| `@InputType` / `@ArgsType` | A separate input silk | Do not reuse the object silk |
| `@Resolver` + `@Query` / `@Mutation` | `resolver` + `query` / `mutation` | |
| `@FieldResolver` + `@Root` | `resolver.of(Type, { field })` | Parent is the first argument of `resolve` |
| `@Arg` / `@Args` | `.input({ ... })` | Arguments become one object |
| `@Ctx` | [`useContext()`](../context.md) | Requires `asyncContextProvider` |
| `@Info` | `useResolverPayload().info` | |
| `@Authorized` + `authChecker` | [Middleware](../middleware.md) | No built-in role checker |
| `@UseMiddleware` | `.use()` or `weave(..., middleware)` | Koa-style onion model |
| `container` / constructor injection | Context or a module-level provider | No built-in IoC container |
| `class-validator` | Zod rules | See validation below |
| `emitSchemaFile` | `printSchema(lexicographicSortSchema(schema))` | See [Printing Schema](../advanced/printing-schema.md) |
| `registerEnumType` | `z.enum` + `asEnumType` | |
| `createUnionType` | `z.union` + `asUnionType` / `resolveType` | |
| `@InterfaceType` | `asObjectType({ interfaces })` | |
| `@Directive` / `@Extensions` | `extensions` (Federation: [Federation](../advanced/federation.md)) | |
| `complexity` | `extensions.complexity` | |
| `DataLoader` | [`field().load()`](../dataloader.md) | |
| `orphanedTypes` | Pass unused silks into `weave` | |

Common field options mapping:

- `description` on silk fields → `z.describe()` or `z.meta({ description })` (operations use `.description()`)
- `deprecationReason` → `.deprecationReason()`
- `nullable: true` → `.nullish()` (see [Gotchas](#gotchas))
- `defaultValue` → Zod `.default(...)`

`asObjectType` and `asField` are the last line of defense between a Zod schema and the GraphQL schema. Declare ordinary names and descriptions with `z.describe()` or `z.meta()`. Reach for `asObjectType` and `asField` only when Zod metadata cannot express GraphQL-only configurations, such as interfaces (`asObjectType({ interfaces })`), hiding a field or overriding its GraphQL type (`asField({ type })`), complexity, or extensions.

## Migration practices

### Scaffold

Install `graphql`, `@gqloom/core`, `zod`, `@gqloom/zod`, and your HTTP server adapter. New GQLoom files do not require `experimentalDecorators`.

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

To match TypeGraphQL's `DateTimeISO` scalar, map `z.date()` using `ZodWeaver.config` and [`GraphQLDateTimeISO`](https://the-guild.dev/graphql/scalars) (where the scalar name in SDL is `DateTimeISO`):

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

Pass `zodWeaverConfig` to `weave`. For HTTP server setup, see [Adapters](../advanced/adapters/).

### Types and resolvers

Name object types using `__typename` or `z.meta({ title })`. Define input types as separate silks named with `z.meta({ title })`. Reserve `asObjectType` as the last line of defense for GraphQL-only configurations. Queries, mutations, and computed fields are defined in `resolver` or `resolver.of`. See the [reference implementation](#reference-implementation) for a complete example.

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

Attach the middleware to an individual operation with `.use(authGuard("ADMIN"))`, or pass it to `weave` as global middleware.

Services previously injected via constructor parameters should be moved to the request context or module-level providers. Do not instantiate services with `new Service()` inside `resolve` unless the service is completely stateless.

### ORMs

If your project already uses Prisma, Drizzle, or MikroORM, pass the entity models directly as silks and generate standard CRUD operations using resolver factories instead of translating `@Entity` and `@ObjectType` into Zod schemas manually. See [Prisma](../schema/prisma.md#resolver-factory), [Drizzle](../schema/drizzle.md#resolver-factory), and [MikroORM](../schema/mikro-orm.md#resolver-factory).

For N+1 queries on relational fields, use [`field().load()`](../dataloader.md) without creating custom DataLoader classes.

## Gotchas

- Object and input silk separation: GraphQL requires output types and input types to remain distinct. TypeGraphQL uses separate `@ObjectType` and `@InputType` classes; in GQLoom, create separate silks rather than reusing an object silk as an input type.

- Nullability and `.optional()`: In Zod, `.optional()` indicates that an object property may be omitted (`undefined`), but does not map to a nullable GraphQL field (`null`). To match TypeGraphQL's `nullable: true` (which produces a nullable `String`), use `.nullish()` or `.nullable()`:

| TypeGraphQL | GraphQL | Zod |
| --- | --- | --- |
| `@Field() title: string` | `String!` | `z.string()` |
| `@Field({ nullable: true }) description?: string` | `String` | `z.string().nullish()` |

- Input validation and error formats: TypeGraphQL allows disabling validation via `validate: false`, whereas GQLoom validates inputs against the schema before invoking the `resolve` function. Arguments that fail validation reject the request before execution. If your application previously depended on receiving unvalidated input, adjust the schema accordingly. The error format also changes: `class-validator` throws `ArgumentValidationError`, while GQLoom returns standard schema issues. Update any clients that parse `extensions.validationErrors`.

- `useContext()` requires `asyncContextProvider`: Calling `useContext()` requires `asyncContextProvider` to be passed into `weave`. On runtimes without `AsyncLocalStorage` support (such as certain Edge runtimes or browsers), access context directly via [`useResolverPayload().context`](../context.md#access-to-resolver-payload-directly).

- `Date` types and `DateTimeISO`: By default, `z.date()` is woven as a GraphQL `String`. To match TypeGraphQL and output a `DateTimeISO` scalar, configure the scalar mapping explicitly using `ZodWeaver.config`.

- Argument default values in SDL: Using `.default(...)` on an input schema applies the default value during runtime parsing. However, the generated GraphQL SDL may still show the argument as nullable rather than `Int! = 0`.

## When to stop

If you encounter the following patterns, evaluate your architecture before attempting a direct migration:

- NestJS integration: Projects using NestJS with TypeGraphQL or `@nestjs/graphql` code-first rely heavily on NestJS decorators and dependency injection, requiring architectural redesign.
- Request-scoped IoC: TypeGraphQL's `using-scoped-container` and per-request `container.get` patterns have no container lifecycle equivalent in GQLoom. Use request-scoped context instead.
- Generic resolvers, deep inheritance, and mixins: GQLoom uses functional composition. Flatten these patterns into standalone `resolver` objects or helper factory functions.
- Custom parameter decorators (`createParameterDecorator`): Replace these with `useContext()` or `.input()` definitions.

TypeGraphQL's `simpleResolvers` setting can generally be ignored. For federation, subscriptions, and custom scalars, see [Federation](../advanced/federation.md), [Subscription](../advanced/subscription.md), and [custom Zod mappings](../schema/zod.md#customize-type-mappings).

## Verification

The goal of migration is maintaining schema contracts and operation behavior:

1. Export the existing GraphQL SDL from TypeGraphQL using `emitSchemaFile` or `printSchema`.
2. Export the GQLoom schema using the same method:

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

3. Compare type names, fields, arguments, nullability, and enum values between both SDL files.
4. Replay existing queries, mutations, and subscriptions to verify response `data`. Validate authorization and input validation errors against the updated error formats (see [Gotchas](#gotchas)).

After all modules are migrated and verified, remove `type-graphql`, `reflect-metadata`, and `class-validator` from your dependencies, and disable `experimentalDecorators` and `emitDecoratorMetadata` in `tsconfig.json`.

## Reference implementation

The following example ports the official TypeGraphQL `simple-usage` Recipe example to GQLoom. Computed fields (`specification`, `averageRating`, `ratingsCount`) are defined on `resolver.of` rather than the base object silk.

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

Compared with TypeGraphQL's official SDL, `ratingsCount.minRate` weaves as a nullable argument because `.default(0)` supplies the default at parse time rather than generating `Int! = 0` in SDL. The field set, main type nullability, and the `DateTimeISO` scalar match the original schema.

Related documentation:

- [Zod](../schema/zod.md): `z.describe()`, `z.meta()`, enums, unions, interfaces, and `asObjectType` / `asField` as the last line of defense
- [Resolver](../resolver.md): `resolver.of`, `query`, `mutation`, and `field`
- [Middleware](../middleware.md): Auth, logging, and output validation
- [Context](../context.md): `useContext` and `asyncContextProvider`
- [DataLoader](../dataloader.md): `field().load()`
