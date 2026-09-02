import {
  field,
  mutation,
  query,
  resolver,
  weave,
  type Middleware,
} from "@gqloom/core"
import { asyncContextProvider, useContext } from "@gqloom/core/context"
import { ZodWeaver } from "@gqloom/zod"
import { GraphQLError, lexicographicSortSchema, printSchema } from "graphql"
import * as z from "zod"

export interface User {
  id: number
  name: string
  roles: string[]
}

export interface Context {
  user?: User
}

/** Mirrors TypeGraphQL `authChecker`: auth-only when `roles` empty, role overlap otherwise. */
export function authGuard(...roles: string[]): Middleware {
  return async (next) => {
    const user = useContext<Context>().user
    if (user == null) {
      throw new GraphQLError("Access denied!")
    }
    if (
      roles.length > 0 &&
      !roles.some((role) => user.roles.includes(role))
    ) {
      throw new GraphQLError("Access denied!")
    }
    return next()
  }
}

const Recipe = z
  .object({
    title: z.string(),
    description: z.string().nullish(),
    ingredients: z.array(z.string()),
    ratings: z.array(z.int()),
  })
  .meta({ title: "Recipe" })

type IRecipe = z.infer<typeof Recipe>

const sampleRecipes: IRecipe[] = [
  {
    title: "Recipe 1",
    description: "Desc 1",
    ingredients: ["one", "two", "three"],
    ratings: [3, 4, 5, 5, 5],
  },
  {
    title: "Recipe 2",
    description: "Desc 2",
    ingredients: ["four", "five", "six"],
    ratings: [3, 4, 5, 3, 2],
  },
  {
    title: "Recipe 3",
    ingredients: ["seven", "eight", "nine"],
    ratings: [4, 4, 5, 5, 4],
  },
]

const recipesData = sampleRecipes.map((recipe) => ({ ...recipe }))

export const recipeResolver = resolver.of(Recipe, {
  recipes: query(z.array(Recipe)).resolve(() => recipesData),

  addRecipe: mutation(Recipe)
    .input({
      title: z.string(),
      description: z.string().nullish(),
    })
    .use(authGuard())
    .resolve(({ title, description }) => {
      const newRecipe: IRecipe = {
        title,
        description,
        ingredients: [],
        ratings: [],
      }
      recipesData.push(newRecipe)
      return newRecipe
    }),

  deleteRecipe: mutation(z.boolean())
    .input({ title: z.string() })
    .use(authGuard("ADMIN"))
    .resolve(({ title }) => {
      const foundRecipeIndex = recipesData.findIndex(
        (recipe) => recipe.title === title,
      )
      if (!foundRecipeIndex) {
        return false
      }
      recipesData.splice(foundRecipeIndex, 1)
      return true
    }),

  ingredients: field(z.array(z.string()))
    .use(authGuard())
    .resolve((recipe) => recipe.ingredients),

  ratings: field(z.array(z.int()))
    .use(authGuard("ADMIN"))
    .resolve((recipe) => recipe.ratings),

  averageRating: field(z.number().nullish()).resolve((recipe) => {
    if (recipe.ratings.length === 0) {
      return null
    }
    return recipe.ratings.reduce((a, b) => a + b, 0) / recipe.ratings.length
  }),
})

export const schema = weave(ZodWeaver, asyncContextProvider, recipeResolver)

export const sdl = printSchema(lexicographicSortSchema(schema))
