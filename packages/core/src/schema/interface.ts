import {
  GraphQLInterfaceType,
  isInterfaceType,
  isObjectType,
  type GraphQLInterfaceTypeConfig,
  type GraphQLOutputType,
} from "graphql"
import { weaverContext } from "./weaver-context"
import {
  createFieldNode,
  createObjectTypeNode,
  ensureInterfaceNode,
} from "./definition-node"
import { extractGqloomExtension } from "./extensions"

export function ensureInterfaceType(
  gqlType: GraphQLOutputType,
  interfaceConfig?: GraphQLInterfaceTypeConfig<any, any>
): GraphQLInterfaceType {
  if (isInterfaceType(gqlType)) return withDirective(gqlType)

  if (!isObjectType(gqlType))
    throw new Error(`${gqlType.toString()} is not an object`)

  const key = gqlType

  const existing = weaverContext.interfaceMap?.get(key)
  if (existing != null) return withDirective(existing)

  const { astNode: _, extensionASTNodes: _1, ...config } = gqlType.toConfig()
  const interfaceType = new GraphQLInterfaceType({
    ...config,
    ...interfaceConfig,
  })

  weaverContext.interfaceMap?.set(key, interfaceType)
  return withDirective(interfaceType)
}

function withDirective(gqlType: GraphQLInterfaceType): GraphQLInterfaceType {
  gqlType.astNode ??= ensureInterfaceNode(
    createObjectTypeNode(
      gqlType.name,
      extractGqloomExtension(gqlType).directives
    )
  )

  Object.entries(gqlType.getFields()).forEach(([name, field]) => {
    field.astNode ??= createFieldNode(
      name,
      field.type,
      extractGqloomExtension(field).directives
    )
  })

  return gqlType
}
