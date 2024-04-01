import { isType, type GraphQLType } from "graphql"
import type { MayPromise } from "../utils"
import type { AnyGraphQLFabric, GraphQLFabric } from "./types"

/**
 * Create a GraphQLFabric Object.
 */
export function fabric<TOutput, TInput = TOutput>(
  type: GraphQLType,
  parse?: (input: TInput) => MayPromise<TOutput>
): GraphQLFabric<TOutput, TInput> {
  return { getType: () => type, parse }
}

export function isFabric(target: any): target is AnyGraphQLFabric {
  return isType(target?.type)
}
