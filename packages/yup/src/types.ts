import type { SYMBOLS, WeaverConfig } from "@gqloom/core"
import type {
  GraphQLEnumTypeConfig,
  GraphQLEnumValueConfig,
  GraphQLFieldConfig,
  GraphQLInterfaceTypeConfig,
  GraphQLObjectTypeConfig,
  GraphQLOutputType,
  GraphQLUnionTypeConfig,
} from "graphql"
import type { Schema, SchemaDescription } from "yup"

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
  type?:
    | GraphQLOutputType
    | (() => GraphQLOutputType)
    | undefined
    | null
    | typeof SYMBOLS.FIELD_HIDDEN
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
