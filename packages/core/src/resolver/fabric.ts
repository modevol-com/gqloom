import { isType, type GraphQLType } from "graphql"
import type { MayPromise } from "../utils"

/*
 * GraphQLFabric is the base unit for creating GraphQL resolvers.
 */
export interface GraphQLFabric<TOutput, TInput> {
  /**
   * GraphQL type for schema
   */
  type: GraphQLType

  /**
   * validate and transform input to output
   */
  parse?: (input: TInput) => MayPromise<TOutput>

  /**
   * Input and output type.
   *
   * @internal
   */
  _types?: { input: TInput; output: TOutput }
}

export type GraphQLFabricIO = [
  object: AnyGraphQLFabric,
  input: "_types.input",
  output: "_types.output",
]

export type AnyGraphQLFabric = GraphQLFabric<any, any>

/**
 * Create a GraphQLFabric Object.
 */
export function fabric<TOutput, TInput = TOutput>(
  type: GraphQLType,
  parse?: (input: TInput) => MayPromise<TOutput>
): GraphQLFabric<TOutput, TInput> {
  return { type, parse }
}

export function isFabric(target: any): target is AnyGraphQLFabric {
  return isType(target?.type)
}
