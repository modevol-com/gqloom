import {
  GraphQLNonNull,
  GraphQLList,
  type GraphQLOutputType,
  type GraphQLScalarType,
} from "graphql"
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
  type: GraphQLOutputType | (() => GraphQLOutputType),
  parse?: (input: TInput) => MayPromise<TOutput>
): GraphQLSilk<TOutput, TInput> {
  return {
    [GET_GRAPHQL_TYPE]: typeof type === "function" ? type : () => type,
    [PARSE]: parse,
  }
}

silk.parse = parseSilk
silk.getType = getGraphQLType
silk.nonNull = nonNullSilk
silk.list = listSilk
silk.nullable = nullableSilk

export type NonNullSilk<TSilk extends GraphQLSilk<any, any>> = GraphQLSilk<
  NonNullable<InferSilkO<TSilk>>,
  NonNullable<InferSilkI<TSilk>>
>

/**
 * Non-nullable Silk.
 */
export function nonNullSilk<TSilk extends GraphQLSilk<any, any>>(
  origin: TSilk
): NonNullSilk<TSilk> {
  return {
    [GET_GRAPHQL_TYPE]: () => {
      const originType = getGraphQLType(origin)
      if (originType instanceof GraphQLNonNull) {
        return originType
      } else {
        return new GraphQLNonNull(originType)
      }
    },
    [PARSE]: (input) => origin[PARSE]?.(input),
  }
}

export type ListSilk<TSilk extends GraphQLSilk<any, any>> = GraphQLSilk<
  EnsureArray<InferSilkO<TSilk>>,
  EnsureArray<InferSilkO<TSilk>>
>

/**
 * List Silk.
 */
export function listSilk<TSilk extends GraphQLSilk<any, any>>(
  origin: TSilk
): ListSilk<TSilk> {
  return {
    [GET_GRAPHQL_TYPE]: () => {
      let originType = getGraphQLType(origin)
      if (
        originType instanceof GraphQLNonNull &&
        originType.ofType instanceof GraphQLList
      ) {
        originType = originType.ofType
      }
      if (originType instanceof GraphQLList) {
        originType = originType.ofType
      }
      return new GraphQLNonNull(new GraphQLList(originType))
    },
  }
}

export type NullableSilk<TSilk extends GraphQLSilk<any, any>> = GraphQLSilk<
  InferSilkO<TSilk> | null | undefined,
  InferSilkI<TSilk>
>

/**
 * Nullable Silk.
 */
export function nullableSilk<TSilk extends GraphQLSilk<any, any>>(
  origin: TSilk
): NullableSilk<TSilk> {
  return {
    [GET_GRAPHQL_TYPE]: () => {
      const originType = getGraphQLType(origin)
      if (originType instanceof GraphQLNonNull) {
        return originType.ofType
      } else {
        return originType
      }
    },
    [PARSE]: (input) => origin[PARSE]?.(input),
  }
}

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
  if (silk[PARSE] == null) return input
  return silk[PARSE](input)
}

export function isSilk(target: any): target is GraphQLSilk {
  if (typeof target !== "object") return false
  if (target == null) return false
  return GET_GRAPHQL_TYPE in target
}

type InferScalarInternal<T extends GraphQLScalarType> =
  T extends GraphQLScalarType<infer TInternal> ? TInternal : never

type InferScalarExternal<T extends GraphQLScalarType> =
  T extends GraphQLScalarType<any, infer TExternal> ? TExternal : never

type EnsureArray<T> = T extends Array<infer U> ? U[] : T[]
