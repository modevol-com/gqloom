import type { EntitySchema } from "@mikro-orm/core"
import {
  GraphQLList,
  GraphQLNonNull,
  type GraphQLObjectType,
  type GraphQLOutputType,
} from "graphql"

/**
 * Store origin GraphQLType for EntitySchema
 */
export const EntityGraphQLTypes = new WeakMap<EntitySchema, GraphQLObjectType>()

export type CapitalizeFirstLetter<TString extends string> =
  TString extends `${infer TFirst}${infer TRest}`
    ? `${Uppercase<TFirst>}${TRest}`
    : TString

export type LowercaseFirstLetter<TString extends string> =
  TString extends `${infer TFirst}${infer TRest}`
    ? `${Lowercase<TFirst>}${TRest}`
    : TString

export function unwrapGraphQLType(
  gqlType: GraphQLOutputType
): Exclude<
  GraphQLOutputType,
  GraphQLList<GraphQLOutputType> | GraphQLNonNull<any>
> {
  if (gqlType instanceof GraphQLNonNull) {
    return unwrapGraphQLType(gqlType.ofType)
  }
  if (gqlType instanceof GraphQLList) {
    return unwrapGraphQLType(gqlType.ofType)
  }
  return gqlType
}
