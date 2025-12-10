import { query, resolver, weave } from "@gqloom/core"
import { asField, ZodWeaver } from "@gqloom/zod"
import type { ComplexityEstimatorArgs } from "graphql-query-complexity"
import * as z from "zod"

declare module "graphql" {
  export interface GraphQLFieldExtensions<_TSource, _TContext, _TArgs = any> {
    complexity?: number | ((args: ComplexityEstimatorArgs) => number)
  }
}

const Post = z.object({
  __typename: z.literal("Post").nullish(),
  title: z.string(),
  description: z.string().register(asField, { complexity: 2 }),
  text: z.string().register(asField, { complexity: 10 }),
})

const postResolver = resolver({
  post: query(Post).resolve(() => ({
    title: "",
    description: "",
    text: "",
  })),

  posts: query(z.array(Post))
    .input({
      limit: z.number().int().nullish().default(10),
      offset: z.number().int().nullish().default(10),
    })
    .extensions({
      complexity: (args: ComplexityEstimatorArgs) => {
        return args.childComplexity * (args.args.limit ?? 10)
      },
    })
    .resolve(() => []),
})

export const schema = weave(ZodWeaver, postResolver)
