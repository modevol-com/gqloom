import {
  GraphQLInterfaceType,
  type GraphQLInterfaceTypeConfig,
  type GraphQLOutputType,
  isInterfaceType,
  isObjectType,
} from "graphql"
import { mapValue } from "../utils"
import { getCacheType } from "./object"
import { weaverContext } from "./weaver-context"

export function ensureInterfaceType(
  gqlType: GraphQLOutputType,
  interfaceConfig?: Partial<GraphQLInterfaceTypeConfig<any, any>>
): GraphQLInterfaceType {
  if (isInterfaceType(gqlType)) return gqlType

  if (!isObjectType(gqlType))
    throw new Error(`${gqlType.toString()} is not an object`)

  const key = gqlType

  const existing = weaverContext.interfaceMap?.get(key)
  if (existing != null) return existing

  const {
    astNode: _,
    extensionASTNodes: _1,
    fields,
    ...config
  } = gqlType.toConfig()
  const interfaceType = new GraphQLInterfaceType({
    ...config,
    ...interfaceConfig,
    fields: mapValue(fields, (field) => {
      return { ...field, type: getCacheType(field.type) }
    }),
  })

  weaverContext.interfaceMap?.set(key, interfaceType)
  return interfaceType
}
