import {
  type GraphQLObjectType,
  GraphQLInterfaceType,
  isInterfaceType,
  type GraphQLInterfaceTypeConfig,
} from "graphql"
import { weaverScope } from "./weaver-scope"

export function ensureInterfaceType(
  gqlType: GraphQLObjectType | GraphQLInterfaceType,
  resolveType?: GraphQLInterfaceTypeConfig<any, any>["resolveType"]
): GraphQLInterfaceType {
  if (isInterfaceType(gqlType)) return gqlType

  const existing = weaverScope.interfaceMap?.get(gqlType)
  if (existing != null) return existing

  const { astNode: _, extensionASTNodes: _1, ...config } = gqlType.toConfig()
  const interfaceType = new GraphQLInterfaceType({ ...config, resolveType })

  weaverScope.interfaceMap?.set(gqlType, interfaceType)
  return interfaceType
}
