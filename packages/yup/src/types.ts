import { type GraphQLEnumValueConfig } from "graphql"

export interface GQLoomMetadata {
  name?: string
  description?: string
  enum?: Record<string, any>
  enumValues?: Record<string, string | GraphQLEnumValueConfig>
}
