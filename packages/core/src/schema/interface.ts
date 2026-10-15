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
  if (isInterfaceType(gqlType)) return internInterface(gqlType)

  if (!isObjectType(gqlType))
    throw new Error(`${gqlType.toString()} is not an object`)

  const key = gqlType

  const existing = weaverContext.interfaceMap?.get(key)
  if (existing != null) return existing

  const { astNode: _, extensionASTNodes: _1, ...config } = gqlType.toConfig()
  const interfaceType = internInterface(
    new GraphQLInterfaceType({
      ...config,
      ...interfaceConfig,
    })
  )

  weaverContext.interfaceMap?.set(key, interfaceType)
  return interfaceType
}

/**
 * Intern `gqlInterface` for the current weave when a weaver context is
 * present. Without a context the interface is returned as is, so a later
 * `weave()` can still run it through `getCacheInterface`.
 */
function internInterface(
  gqlInterface: GraphQLInterfaceType
): GraphQLInterfaceType {
  const context = weaverContext.value
  return context ? getCacheInterface(gqlInterface, context) : gqlInterface
}
