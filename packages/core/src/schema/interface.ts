import {
  GraphQLInterfaceType,
  type GraphQLInterfaceTypeConfig,
  type GraphQLOutputType,
  isInterfaceType,
  isObjectType,
} from "graphql"
import { getCacheInterface } from "./object"
import { weaverContext } from "./weaver-context"

export function ensureInterfaceType(
  gqlType: GraphQLOutputType,
  interfaceConfig?: Partial<GraphQLInterfaceTypeConfig<any, any>>
): GraphQLInterfaceType {
  const context = weaverContext.value
  if (isInterfaceType(gqlType)) {
    return context ? getCacheInterface(gqlType, context) : gqlType
  }

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
  // Without a weaver context, return the interface unmarked so a later
  // `weave()` can still run it through `getCacheInterface`.
  const interned = context
    ? getCacheInterface(interfaceType, context)
    : interfaceType
  weaverContext.interfaceMap?.set(key, interned)
  return interned
}
