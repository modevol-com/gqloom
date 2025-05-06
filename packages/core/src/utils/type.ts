import type { GraphQLNonNull } from "graphql"
import type { GraphQLOutputType } from "graphql"
import { isListType } from "graphql"
import type { GraphQLList } from "graphql"
import { isNonNullType } from "graphql"

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
