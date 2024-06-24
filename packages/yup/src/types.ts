import { type SYMBOLS, type WeaverConfig } from "@gqloom/core"
import {
  type ThunkReadonlyArray,
  type GraphQLEnumValueConfig,
  type GraphQLObjectTypeConfig,
  type GraphQLInterfaceTypeConfig,
  type GraphQLOutputType,
  type GraphQLObjectTypeExtensions,
  type GraphQLFieldExtensions,
  type GraphQLEnumTypeConfig,
  type GraphQLUnionTypeConfig,
  type GraphQLFieldConfig,
} from "graphql"
import { type SchemaDescription, type Schema } from "yup"

export interface GQLoomMetadata {
  name?: string
  description?: string
  enum?: Record<string, any>
  enumValues?: Record<string, string | GraphQLEnumValueConfig>

  interfaces?: ThunkReadonlyArray<Schema>

  extension?:
    | GraphQLObjectTypeExtensions
    | GraphQLFieldExtensions<any, any, any>

  type?: (() => GraphQLOutputType) | null

  field?: GraphQLFieldConfig<any, any, any>
  objectType?: GraphQLObjectTypeConfig<any, any>
  interfaceType?: GraphQLInterfaceTypeConfig<any, any>
  enumType?: GraphQLEnumTypeConfig
  unionType?: GraphQLUnionTypeConfig<any, any>
}

export interface YupWeaverOptions {
  yupPresetGraphQLType?: (
    description: SchemaDescription
  ) => GraphQLOutputType | undefined
}

export interface YupWeaverConfigOptions {
  presetGraphQLType?: (
    description: SchemaDescription
  ) => GraphQLOutputType | undefined
}

export interface YupWeaverConfig extends WeaverConfig, YupWeaverConfigOptions {
  [SYMBOLS.WEAVER_CONFIG]: "gqloom.yup"
}
