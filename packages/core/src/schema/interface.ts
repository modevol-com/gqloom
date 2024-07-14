import {
  GraphQLInterfaceType,
  isInterfaceType,
  isObjectType,
  type GraphQLInterfaceTypeConfig,
  type GraphQLOutputType,
} from "graphql"
import { weaverContext } from "./weaver-context"

export function ensureInterfaceType(
  gqlType: GraphQLOutputType,
  interfaceConfig?: GraphQLInterfaceTypeConfig<any, any>
): GraphQLInterfaceType {
  if (isInterfaceType(gqlType)) return gqlType

  if (!isObjectType(gqlType))
    throw new Error(`${gqlType.toString()} is not an object`)

  const key = gqlType

  const existing = weaverContext.interfaceMap?.get(key)
  if (existing != null) return existing

  const { astNode: _, extensionASTNodes: _1, ...config } = gqlType.toConfig()
  const interfaceType = new GraphQLInterfaceType({
    ...config,
    ...interfaceConfig,
  })

  weaverContext.interfaceMap?.set(key, interfaceType)
  return interfaceType
}
