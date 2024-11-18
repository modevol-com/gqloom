import type { GraphQLOutputType } from "graphql"

export abstract class SchemaVendorWeaver {
  static vendor: string
  static getGraphQLType: (schema: any) => GraphQLOutputType
}
export function isSchemaVendorWeaver(
  some: any
): some is typeof SchemaVendorWeaver {
  if (typeof some !== "object" && typeof some !== "function") return false
  if (!("getGraphQLType" in some) || typeof some.getGraphQLType !== "function")
    return false
  if (!("vendor" in some) || typeof some.vendor !== "string") return false

  return true
}
