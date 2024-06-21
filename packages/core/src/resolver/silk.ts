import type { GraphQLOutputType, GraphQLScalarType } from "graphql"
import type { MayPromise } from "../utils"
import type { GraphQLSilk, InferSilkI, InferSilkO } from "./types"
import { GET_GRAPHQL_TYPE, PARSE } from "../utils/symbols"

/**
 * Create a Silk from Scalar.
 */
export function silk<TScalar extends GraphQLScalarType>(
  type: TScalar,
  parse?: (
    input: InferScalarExternal<TScalar>
  ) => MayPromise<InferScalarInternal<TScalar>>
): GraphQLSilk<
  InferScalarInternal<TScalar> | undefined,
  InferScalarInternal<TScalar> | undefined
>

/**
 * Create a GraphQLSilk Object.
 */
export function silk<TOutput, TInput = TOutput>(
  type: GraphQLOutputType,
  parse?: (input: TInput) => MayPromise<TOutput>
): GraphQLSilk<TOutput, TInput>

export function silk<TOutput, TInput = TOutput>(
  type: GraphQLOutputType,
  parse?: (input: TInput) => MayPromise<TOutput>
): GraphQLSilk<TOutput, TInput> {
  return { [GET_GRAPHQL_TYPE]: () => type, [PARSE]: parse }
}

silk.parse = parseSilk
silk.getGraphQLType = getGraphQLType

/**
 * Get GraphQL Output Type from Silk.
 * @param silk GraphQL Silk
 * @returns GraphQL Output Type
 */
export function getGraphQLType(silk: GraphQLSilk): GraphQLOutputType {
  return silk[GET_GRAPHQL_TYPE]()
}

/**
 * Validate and transform input to output
 * @param silk silk GraphQL Silk
 * @param input
 * @returns output
 */
export function parseSilk<TSilk extends GraphQLSilk>(
  silk: TSilk,
  input: InferSilkI<TSilk>
): MayPromise<InferSilkO<TSilk>> {
  return silk[PARSE]?.(input) ?? input
}

export function isSilk(target: object): target is GraphQLSilk {
  if (typeof target !== "object") return false
  return GET_GRAPHQL_TYPE in target
}

type InferScalarInternal<T extends GraphQLScalarType> =
  T extends GraphQLScalarType<infer TInternal> ? TInternal : never

type InferScalarExternal<T extends GraphQLScalarType> =
  T extends GraphQLScalarType<any, infer TExternal> ? TExternal : never
