import { type EntityMetadata, Platform } from "@mikro-orm/core"
import {
  GraphQLList,
  GraphQLNonNull,
  type GraphQLObjectType,
  type GraphQLOutputType,
} from "graphql"

class DefaultPlatform extends Platform {}

export const platform = new DefaultPlatform()

/**
 * Store origin GraphQLType for EntitySchema
 */
export const EntityGraphQLTypes = new WeakMap<
  EntityMetadata,
  GraphQLObjectType
>()

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

export function isSubclass<TParent>(
  childClass: any,
  parentClass: TParent
): childClass is TParent {
  return (
    Object.is(childClass, parentClass) ||
    childClass.prototype instanceof (parentClass as any)
  )
}
