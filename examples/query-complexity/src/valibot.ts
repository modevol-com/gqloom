import { query, resolver, weave } from "@gqloom/core"
import { asField, ValibotWeaver } from "@gqloom/valibot"
import type { ComplexityEstimatorArgs } from "graphql-query-complexity"
import * as v from "valibot"

declare module "graphql" {
  export interface GraphQLFieldExtensions<_TSource, _TContext, _TArgs = any> {
    complexity?: number | ((args: ComplexityEstimatorArgs) => number)
  }
}

const Post = v.object({
  __typename: v.nullish(v.literal("Post")),
  title: v.string(),
  description: v.pipe(
    v.string(),
    asField({
      extensions: { complexity: 2 },
    })
  ),
  text: v.pipe(
    v.string(),
    asField({
      extensions: { complexity: 10 },
    })
  ),
})

const postResolver = resolver({
  post: query(Post).resolve(() => ({
    title: "",
    description: "",
    text: "",
  })),

  posts: query(v.array(Post))
    .input({
      limit: v.nullish(v.pipe(v.number(), v.integer()), 10),
      offset: v.nullish(v.pipe(v.number(), v.integer()), 10),
    })
    .extensions({
      complexity: (args: ComplexityEstimatorArgs) => {
        return args.childComplexity * (args.args.limit ?? 10)
      },
    })
    .resolve(() => []),
})

export const schema = weave(ValibotWeaver, postResolver)
