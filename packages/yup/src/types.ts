import { type SYMBOLS, type WeaverConfig } from "@gqloom/core"
import {
  type GraphQLEnumValueConfig,
  type GraphQLObjectTypeConfig,
  type GraphQLInterfaceTypeConfig,
  type GraphQLOutputType,
  type GraphQLEnumTypeConfig,
  type GraphQLUnionTypeConfig,
  type GraphQLFieldConfig,
} from "graphql"
import { type SchemaDescription, type Schema } from "yup"

export interface GQLoomMetadata {
  description?: string

  asField?: FieldConfig

  asObjectType?: ObjectTypeConfig

  asInterfaceType?: Partial<GraphQLInterfaceTypeConfig<any, any>>

  asEnumType?: EnumTypeConfig

  asUnionType?: Partial<GraphQLUnionTypeConfig<any, any>>
}

export interface FieldConfig
  extends Partial<Omit<GraphQLFieldConfig<any, any>, "type">> {
  type?: GraphQLOutputType | (() => GraphQLOutputType) | undefined | null
}

export interface ObjectTypeConfig
  extends Partial<
    Omit<GraphQLObjectTypeConfig<any, any>, "fields" | "interfaces">
  > {
  interfaces?: Schema[]
}

export interface EnumTypeConfig extends Partial<GraphQLEnumTypeConfig> {
  enum?: Record<string, any>
  valuesConfig?: Record<string, GraphQLEnumValueConfig>
}

export interface GQLoomMetadataOptions {}

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
