import { type GraphQLType } from "graphql"
import type { MayPromise } from "../utils"
import type { AnyGraphQLSilk, GraphQLSilk } from "./types"

/**
 * Create a GraphQLSilk Object.
 */
export function silk<TOutput, TInput = TOutput>(
  type: GraphQLType,
  parse?: (input: TInput) => MayPromise<TOutput>
): GraphQLSilk<TOutput, TInput> {
  return { getType: () => type, parse }
}

export function isSilk(target: any): target is AnyGraphQLSilk {
  return typeof target?.getType === "function"
}
