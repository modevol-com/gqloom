import {
  GraphQLInterfaceType,
  isInterfaceType,
  isObjectType,
  type GraphQLInterfaceTypeConfig,
  type GraphQLOutputType,
} from "graphql"
import { weaverScope } from "./weaver-scope"

export function ensureInterfaceType(
  gqlType: GraphQLOutputType,
  resolveType?: GraphQLInterfaceTypeConfig<any, any>["resolveType"]
): GraphQLInterfaceType {
  if (isInterfaceType(gqlType)) return gqlType

  const existing = weaverScope.interfaceMap?.get(gqlType)
  if (existing != null) return existing

  if (!isObjectType(gqlType))
    throw new Error(`${gqlType.toString()} is not a object`)

  const { astNode: _, extensionASTNodes: _1, ...config } = gqlType.toConfig()
  const interfaceType = new GraphQLInterfaceType({ ...config, resolveType })

  weaverScope.interfaceMap?.set(gqlType, interfaceType)
  return interfaceType
}
