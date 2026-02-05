import type { StandardSchemaV1 } from "@standard-schema/spec"
import {
  type GraphQLArgumentConfig,
  GraphQLList,
  GraphQLNonNull,
  type GraphQLNullableType,
  type GraphQLObjectType,
  type GraphQLOutputType,
  type GraphQLScalarType,
} from "graphql"
import { weaverContext } from "../schema/weaver-context"
import type { MayPromise } from "../utils"
import { GET_GRAPHQL_ARGUMENT_CONFIG, GET_GRAPHQL_TYPE } from "../utils/symbols"
import type { GraphQLSilk } from "./types"

/**
 * Create a Silk from Scalar.
 */
export function silk<TScalar extends GraphQLVariants<GraphQLScalarType>>(
  type: TScalar | (() => TScalar),
  validate?: (
    value: InferScalarExternalByVariants<TScalar>
  ) =>
    | StandardSchemaV1.Result<InferScalarExternalByVariants<TScalar>>
    | Promise<StandardSchemaV1.Result<InferScalarInternalByVariants<TScalar>>>
): GraphQLSilk<
  InferScalarInternalByVariants<TScalar>,
  InferScalarInternalByVariants<TScalar>
>

/**
 * Create a GraphQLSilk Object.
 */
export function silk<TObject extends GraphQLVariants<GraphQLObjectType>>(
  type: TObject | (() => TObject),
  validate?: (
    value: InferObjectSourceByVariants<TObject>
  ) =>
    | StandardSchemaV1.Result<InferObjectSourceByVariants<TObject>>
    | Promise<StandardSchemaV1.Result<InferObjectSourceByVariants<TObject>>>
): GraphQLSilk<
  InferObjectSourceByVariants<TObject>,
  InferObjectSourceByVariants<TObject>
>

/**
 * Create a GraphQLSilk Object.
 */
export function silk<TOutput, TInput = TOutput>(
  type: GraphQLOutputType | (() => GraphQLOutputType),
  validate?: (
    value: TInput
  ) =>
    | StandardSchemaV1.Result<TOutput>
    | Promise<StandardSchemaV1.Result<TOutput>>
): GraphQLSilk<TOutput, TInput>

export function silk<TOutput, TInput = TOutput>(
  type: GraphQLOutputType | (() => GraphQLOutputType),
  validate: (
    value: TInput
  ) =>
    | StandardSchemaV1.Result<TOutput>
    | Promise<StandardSchemaV1.Result<TOutput>> = (value) => ({
    value: (value ?? undefined) as unknown as TOutput,
  })
): GraphQLSilk<TOutput, TInput> {
  return {
    [GET_GRAPHQL_TYPE]: type,
    "~standard": {
      version: 1,
      vendor: "gqloom.silk",
      validate,
    } as StandardSchemaV1.Props<TInput, TOutput>,
  }
}

silk.is = isSilk
silk.parse = parseSilk
silk.getType = getGraphQLType
silk.nonNull = nonNullSilk
silk.list = listSilk
silk.nullable = nullableSilk

export type NonNullSilk<TSilk extends GraphQLSilk<any, any>> = GraphQLSilk<
  NonNullable<StandardSchemaV1.InferOutput<TSilk>>,
  NonNullable<StandardSchemaV1.InferInput<TSilk>>
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
  Array<StandardSchemaV1.InferOutput<TSilk>>,
  Array<StandardSchemaV1.InferOutput<TSilk>>
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
        originType = originType.ofType.ofType
      }
      if (originType instanceof GraphQLList) {
        originType = originType.ofType
      }
      return new GraphQLNonNull(new GraphQLList(originType))
    },
  }
}

export type NullableSilk<TSilk extends GraphQLSilk<any, any>> = GraphQLSilk<
  StandardSchemaV1.InferOutput<TSilk> | null | undefined,
  StandardSchemaV1.InferInput<TSilk>
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
  if (GET_GRAPHQL_TYPE in silk && silk[GET_GRAPHQL_TYPE] != null) {
    return typeof silk[GET_GRAPHQL_TYPE] === "function"
      ? silk[GET_GRAPHQL_TYPE]()
      : silk[GET_GRAPHQL_TYPE]
  }

  const vendorWeavers = weaverContext.vendorWeavers
  if (vendorWeavers == null) throw new Error("Schema Weaver is not initialized")

  const vendor = silk["~standard"]?.vendor
  const weaver = vendor ? vendorWeavers.get(vendor) : undefined
  if (weaver != null) return weaver.getGraphQLType(silk)

  if (silk["~standard"] && "jsonSchema" in silk["~standard"]) {
    const jsonWeaver = vendorWeavers.get("json")
    if (jsonWeaver != null) return jsonWeaver.getGraphQLType(silk)
  }

  throw new Error(`Schema Weaver for ${vendor} is not found`)
}

/**
 * Get GraphQL Argument Config from Silk.
 * @param silk GraphQL Silk
 * @returns GraphQL Argument Config
 */
export function getGraphQLArgumentConfig(
  silk: GraphQLSilk
): Omit<GraphQLArgumentConfig, "type" | "astNode"> | undefined {
  if (
    GET_GRAPHQL_ARGUMENT_CONFIG in silk &&
    silk[GET_GRAPHQL_ARGUMENT_CONFIG] != null
  ) {
    return typeof silk[GET_GRAPHQL_ARGUMENT_CONFIG] === "function"
      ? silk[GET_GRAPHQL_ARGUMENT_CONFIG]()
      : silk[GET_GRAPHQL_ARGUMENT_CONFIG]
  }

  const vendorWeavers = weaverContext.vendorWeavers
  if (vendorWeavers == null) return undefined

  const vendor = silk["~standard"]?.vendor
  const weaver = vendor ? vendorWeavers.get(vendor) : undefined

  if (weaver?.getGraphQLArgumentConfig != null) {
    return weaver.getGraphQLArgumentConfig(silk)
  }

  if (silk["~standard"] && "jsonSchema" in silk["~standard"]) {
    const jsonWeaver = vendorWeavers.get("json")
    if (jsonWeaver?.getGraphQLArgumentConfig != null) {
      return jsonWeaver.getGraphQLArgumentConfig(silk)
    }
  }

  return undefined
}

/**
 * Validate and transform input to output
 * @param silk silk GraphQL Silk
 * @param input
 * @returns output
 */
export function parseSilk<TSilk extends GraphQLSilk>(
  silk: TSilk,
  input: StandardSchemaV1.InferInput<TSilk>
): MayPromise<StandardSchemaV1.Result<StandardSchemaV1.InferOutput<TSilk>>> {
  return silk["~standard"].validate(input)
}

export function isSilk(target: any): target is GraphQLSilk {
  if (typeof target !== "object" && typeof target !== "function") return false

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

type GraphQLVariants<TSource extends GraphQLNullableType> =
  | TSource
  | GraphQLList<TSource>
  | GraphQLList<GraphQLNonNull<TSource>>
  | GraphQLNonNull<TSource>
  | GraphQLNonNull<GraphQLList<TSource>>
  | GraphQLNonNull<GraphQLList<GraphQLNonNull<TSource>>>

type InferScalarInternalByVariants<
  T extends GraphQLVariants<GraphQLScalarType>,
> =
  T extends GraphQLNonNull<infer U>
    ? U extends GraphQLVariants<GraphQLScalarType>
      ? NonNullable<InferScalarInternalByVariants<U>>
      : never
    : T extends GraphQLList<infer U>
      ? U extends GraphQLVariants<GraphQLScalarType>
        ? InferScalarInternalByVariants<U>[]
        : never
      : T extends GraphQLScalarType<infer TInternal, any>
        ? TInternal | null | undefined
        : never

type InferScalarExternalByVariants<
  T extends GraphQLVariants<GraphQLScalarType>,
> =
  T extends GraphQLNonNull<infer U>
    ? U extends GraphQLVariants<GraphQLScalarType>
      ? NonNullable<InferScalarExternalByVariants<U>>
      : never
    : T extends GraphQLList<infer U>
      ? U extends GraphQLVariants<GraphQLScalarType>
        ? InferScalarExternalByVariants<U>[]
        : never
      : T extends GraphQLScalarType<any, infer TExternal>
        ? TExternal | null | undefined
        : never

type InferObjectSourceByVariants<T extends GraphQLVariants<GraphQLObjectType>> =
  T extends GraphQLNonNull<infer U>
    ? U extends GraphQLVariants<GraphQLObjectType>
      ? NonNullable<InferObjectSourceByVariants<U>>
      : never
    : T extends GraphQLList<infer U>
      ? U extends GraphQLVariants<GraphQLObjectType>
        ? InferObjectSourceByVariants<U>[]
        : never
      : T extends GraphQLObjectType<infer TSource>
        ? TSource | null | undefined
        : never
