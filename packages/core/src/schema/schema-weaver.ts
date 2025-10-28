import type { GraphQLArgumentConfig, GraphQLOutputType } from "graphql"

export interface SchemaWeaver {
  vendor: string
  getGraphQLType: (schema: any) => GraphQLOutputType
  getGraphQLArgumentConfig?: (
    schema: any
  ) => Omit<GraphQLArgumentConfig, "type"> | undefined
}

export function isSchemaVendorWeaver(some: any): some is SchemaWeaver {
  if (some == null) return false
  if (typeof some !== "object" && typeof some !== "function") return false
  if (!("getGraphQLType" in some) || typeof some.getGraphQLType !== "function")
    return false
  if (!("vendor" in some) || typeof some.vendor !== "string") return false

  return true
}
