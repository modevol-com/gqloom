import {
  field,
  query,
  resolver,
  weave,
  type Middleware,
} from "@gqloom/core"
import { asyncContextProvider, useContext, useResolverPayload } from "@gqloom/core/context"
import { ZodWeaver } from "@gqloom/zod"
import { GraphQLError, lexicographicSortSchema, printSchema } from "graphql"
import * as z from "zod"

// --- Types & data (from TypeGraphQL example) ---

interface User {
  id: number
  name: string
}

export interface Context {
  currentUser: User
}

const MAX_ID_VALUE = 3

const Recipe = z
  .object({
    __typename: z.literal("Recipe").nullish(),
    id: z.int(),
    title: z.string(),
    description: z.string().nullish(),
    ratings: z.array(z.int()),
  })
  .meta({ title: "Recipe" })

type IRecipe = z.infer<typeof Recipe>

let lastRecipeId = 0

function createRecipe(recipeData: Partial<IRecipe>): IRecipe {
  return {
    id: lastRecipeId++,
    title: recipeData.title ?? "",
    description: recipeData.description,
    ratings: recipeData.ratings ?? [],
  }
}

const items: IRecipe[] = [
  createRecipe({
    description: "Desc 1",
    title: "Recipe 1",
    ratings: [0, 3, 1],
  }),
  createRecipe({
    description: "Desc 2",
    title: "Recipe 2",
    ratings: [4, 2, 3, 1],
  }),
  createRecipe({
    description: "Desc 3",
    title: "Recipe 3",
    ratings: [4, 5, 3, 1, 5],
  }),
]

// --- Logger (replaces typedi-injected Logger service) ---

const logger = {
  log(...args: unknown[]) {
    console.log(...args)
  },
}

// --- Middlewares (TypeGraphQL @UseMiddleware / globalMiddlewares) ---

/** Maps ResolveTimeMiddleware on RecipeResolver class */
export const resolveTimeMiddleware: Middleware = async (next) => {
  const info = useResolverPayload()!.info
  const start = Date.now()
  const result = await next()
  const resolveTime = Date.now() - start
  console.log(`${info.parentType.name}.${info.fieldName} [${resolveTime} ms]`)
  return result
}

/** Maps LogAccessMiddleware on Recipe.ratings @Field */
export const logAccessMiddleware: Middleware = async (next) => {
  const { context, info } = useResolverPayload()!
  logger.log(
    `Logging access: ${(context as Context).currentUser.name} -> ${info.parentType.name}.${info.fieldName}`,
  )
  return next()
}

/** Maps NumberInterceptor(minValue) on Recipe.averageRating getter */
export function numberInterceptor(minValue: number): Middleware {
  return async (next) => {
    const result = await next()
    if (typeof result === "number" && result < minValue) {
      return null
    }
    return result
  }
}

function isValidationError(err: unknown): boolean {
  return (
    err instanceof GraphQLError &&
    Array.isArray((err.extensions as { issues?: unknown })?.issues)
  )
}

/** Maps global ErrorLoggerMiddleware */
export const errorLoggerMiddleware: Middleware = async (next) => {
  try {
    return await next()
  } catch (err) {
    const payload = useResolverPayload()
    logger.log({
      message: (err as Error).message,
      operation: payload?.info.operation.operation,
      fieldName: payload?.info.fieldName,
      userName: useContext<Context>().currentUser.name,
    })
    if (!isValidationError(err)) {
      throw new Error("Unknown error occurred. Try again later!")
    }
    throw err
  }
}

// --- Resolver ---

export const recipeResolver = resolver
  .of(Recipe, {
    recipe: query(Recipe.nullish())
      .input({
        id: z
          .int()
          .nullish()
          .describe("Accepts provided id or generates a random one.")
          .transform((value) => value ?? Math.round(Math.random() * MAX_ID_VALUE))
          .refine((value) => value >= 0 && value <= MAX_ID_VALUE, {
            message: "Invalid value for id",
          }),
      })
      .resolve(({ id }) => {
        console.log(`Queried for recipe with id: ${id}`)
        return items.find((item) => item.id === id) ?? null
      }),

    recipes: query(z.array(Recipe))
      .input({
        skip: z.int().min(0).default(0),
        take: z.int().min(1).max(50).default(10),
      })
      .resolve(({ skip, take }) => {
        const currentUser = useContext<Context>().currentUser
        console.log(`User "${currentUser.name}" queried for recipes!`)
        return items.slice(skip, skip + take)
      }),

    ratings: field(z.array(z.int()))
      .use(logAccessMiddleware)
      .resolve((recipe) => recipe.ratings),

    averageRating: field(z.number().nullish())
      .use(numberInterceptor(3))
      .resolve((recipe) => {
        const ratingsCount = recipe.ratings.length
        if (ratingsCount === 0) {
          return null
        }
        const ratingsSum = recipe.ratings.reduce((a, b) => a + b, 0)
        return ratingsSum / ratingsCount
      }),
  })
  .use(resolveTimeMiddleware)

export const schema = weave(
  ZodWeaver,
  asyncContextProvider,
  recipeResolver,
  errorLoggerMiddleware,
)

export const sdl = printSchema(lexicographicSortSchema(schema))

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(sdl)
}
