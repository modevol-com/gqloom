import type { WeaverConfig } from "@gqloom/core"
// biome-ignore lint/correctness/noUnusedImports: SYMBOLS used in type
import type { SYMBOLS } from "@gqloom/core"
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
