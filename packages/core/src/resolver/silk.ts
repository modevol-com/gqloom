import { v1 } from "@standard-schema/spec"
import {
  GraphQLList,
  GraphQLNonNull,
  type GraphQLOutputType,
  type GraphQLScalarType,
} from "graphql"
import type { MayPromise } from "../utils"
import { GET_GRAPHQL_TYPE } from "../utils/symbols"
import type { GraphQLSilk } from "./types"
import { weaverContext } from "../schema"

/**
 * Create a Silk from Scalar.
 */
export function silk<TScalar extends GraphQLScalarType>(
  type: TScalar | (() => TScalar),
  parse?: (
    value: InferScalarExternal<TScalar>
  ) =>
    | v1.StandardResult<InferScalarExternal<TScalar>>
    | Promise<v1.StandardResult<InferScalarInternal<TScalar>>>
): GraphQLSilk<
  InferScalarInternal<TScalar> | undefined,
  InferScalarInternal<TScalar> | undefined
>

/**
 * Create a GraphQLSilk Object.
 */
export function silk<TOutput, TInput = TOutput>(
  type: GraphQLOutputType | (() => GraphQLOutputType),
  validate?: (
    value: TInput
  ) => v1.StandardResult<TOutput> | Promise<v1.StandardResult<TOutput>>
): GraphQLSilk<TOutput, TInput>

export function silk<TOutput, TInput = TOutput>(
  type: GraphQLOutputType | (() => GraphQLOutputType),
  validate: (
    value: TInput
  ) => v1.StandardResult<TOutput> | Promise<v1.StandardResult<TOutput>> = (
    value
  ) => ({ value: (value ?? undefined) as unknown as TOutput })
): GraphQLSilk<TOutput, TInput> {
  return {
    [GET_GRAPHQL_TYPE]: typeof type === "function" ? type : () => type,
    "~standard": {
      version: 1,
      vendor: "gqloom.silk",
      validate,
    } as v1.StandardSchemaProps<TInput, TOutput>,
  }
}

silk.parse = parseSilk
silk.getType = getGraphQLType
silk.nonNull = nonNullSilk
silk.list = listSilk
silk.nullable = nullableSilk

export type NonNullSilk<TSilk extends GraphQLSilk<any, any>> = GraphQLSilk<
  NonNullable<v1.InferOutput<TSilk>>,
  NonNullable<v1.InferInput<TSilk>>
>

/**
 * Non-nullable Silk.
 */
export function nonNullSilk<TSilk extends GraphQLSilk<any, any>>(
  origin: TSilk
): NonNullSilk<TSilk> {
  return {
    ...origin,
    [GET_GRAPHQL_TYPE]: () => {
      const originType = getGraphQLType(origin)
      if (originType instanceof GraphQLNonNull) {
        return originType
      } else {
        return new GraphQLNonNull(originType)
      }
    },
  }
}

export type ListSilk<TSilk extends GraphQLSilk<any, any>> = GraphQLSilk<
  EnsureArray<v1.InferOutput<TSilk>>,
  EnsureArray<v1.InferOutput<TSilk>>
>

/**
 * List Silk.
 */
export function listSilk<TSilk extends GraphQLSilk<any, any>>(
  origin: TSilk
): ListSilk<TSilk> {
  return {
    ...origin,
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
  v1.InferOutput<TSilk> | null | undefined,
  v1.InferInput<TSilk>
>

/**
 * Nullable Silk.
 */
export function nullableSilk<TSilk extends GraphQLSilk<any, any>>(
  origin: TSilk
): NullableSilk<TSilk> {
  return {
    ...origin,
    [GET_GRAPHQL_TYPE]: () => {
      const originType = getGraphQLType(origin)
      if (originType instanceof GraphQLNonNull) {
        return originType.ofType
      } else {
        return originType
      }
    },
  }
}

/**
 * Get GraphQL Output Type from Silk.
 * @param silk GraphQL Silk
 * @returns GraphQL Output Type
 */
export function getGraphQLType(silk: GraphQLSilk): GraphQLOutputType {
  if (GET_GRAPHQL_TYPE in silk && silk[GET_GRAPHQL_TYPE] != null)
    return silk[GET_GRAPHQL_TYPE]()

  const vendorWeavers = weaverContext.vendorWeavers
  if (vendorWeavers == null) throw new Error("Schema Weaver is not initialized")

  const weaver = vendorWeavers.get(silk["~standard"].vendor)
  if (weaver == null)
    throw new Error(
      `Schema Weaver for ${silk["~standard"].vendor} is not found`
    )
  return weaver.getGraphQLType(silk)
}

/**
 * Validate and transform input to output
 * @param silk silk GraphQL Silk
 * @param input
 * @returns output
 */
export function parseSilk<TSilk extends GraphQLSilk>(
  silk: TSilk,
  input: v1.InferInput<TSilk>
): MayPromise<v1.StandardResult<v1.InferOutput<TSilk>>> {
  return silk["~standard"].validate(input)
}

export function isSilk(target: any): target is GraphQLSilk {
  if (typeof target !== "object") return false
  if (target == null) return false
  if (GET_GRAPHQL_TYPE in target) return true
  if (!("~standard" in target)) return false
  return (
    "vendor" in target["~standard"] &&
    typeof target["~standard"].vendor === "string" &&
    "version" in target["~standard"] &&
    typeof target["~standard"].version === "number"
  )
}

type InferScalarInternal<T extends GraphQLScalarType> =
  T extends GraphQLScalarType<infer TInternal> ? TInternal : never

type InferScalarExternal<T extends GraphQLScalarType> =
  T extends GraphQLScalarType<any, infer TExternal> ? TExternal : never

type EnsureArray<T> = T extends Array<infer U> ? U[] : T[]
