import {
  type ThunkReadonlyArray,
  type GraphQLEnumValueConfig,
  type GraphQLObjectTypeConfig,
  type GraphQLInterfaceTypeConfig,
  type GraphQLOutputType,
} from "graphql"
import { type SchemaDescription, type Schema } from "yup"

export interface GQLoomMetadata {
  name?: string
  description?: string
  enum?: Record<string, any>
  enumValues?: Record<string, string | GraphQLEnumValueConfig>

  interfaces?: ThunkReadonlyArray<Schema>

  /**
   * For `object`
   *
   * How should objects be distinguished when using `interface` and `union`?
   */
  isTypeOf?: GraphQLObjectTypeConfig<any, any>["isTypeOf"]

  /**
   * For `interface`, `union`
   *
   * Optionally provide a custom type resolver function. If one is not provided,
   * the default implementation will call `isTypeOf` on each implementing
   * Object type.
   */
  resolveType?: GraphQLInterfaceTypeConfig<any, any>["resolveType"]
}

export interface YupWeaverOptions {
  yupPresetGraphQLType?: (
    description: SchemaDescription
  ) => GraphQLOutputType | undefined
}
