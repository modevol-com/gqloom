import type { GraphQLList, GraphQLNonNull, GraphQLOutputType } from "graphql"
import { isListType, isNonNullType } from "graphql"

export function unwrapType(
  gqlType: GraphQLOutputType
): Exclude<
  GraphQLOutputType,
  GraphQLList<GraphQLOutputType> | GraphQLNonNull<any>
> {
  if (isNonNullType(gqlType)) {
    return unwrapType(gqlType.ofType)
  }
  if (isListType(gqlType)) {
    return unwrapType(gqlType.ofType)
  }
  return gqlType
}
