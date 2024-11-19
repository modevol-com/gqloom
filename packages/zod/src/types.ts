import type { WeaverConfig } from "@gqloom/core"
// biome-ignore lint/correctness/noUnusedImports: SYMBOLS used in type
import type { SYMBOLS } from "@gqloom/core"
import type {
  GraphQLEnumTypeConfig,
  GraphQLEnumValueConfig,
  GraphQLFieldConfig,
  GraphQLInterfaceType,
  GraphQLObjectTypeConfig,
  GraphQLOutputType,
  GraphQLUnionTypeConfig,
} from "graphql"
import type { Schema, ZodObject, ZodRawShape } from "zod"

export interface ObjectConfig
  extends Omit<
      GraphQLObjectTypeConfig<any, any>,
      "fields" | "name" | "interfaces"
    >,
    Partial<Pick<GraphQLObjectTypeConfig<any, any>, "fields" | "name">> {
  interfaces?: (ZodObject<ZodRawShape> | GraphQLInterfaceType)[]
}

export interface FieldConfig
  extends Partial<Omit<GraphQLFieldConfig<any, any>, "type">> {
  type?: GraphQLOutputType | undefined | null
}

export interface EnumConfig<TKey = string>
  extends Partial<GraphQLEnumTypeConfig> {
  valuesConfig?: TKey extends string
    ? Partial<Record<TKey, GraphQLEnumValueConfig>>
    : Partial<Record<string, GraphQLEnumValueConfig>>
}

export interface UnionConfig
  extends Omit<GraphQLUnionTypeConfig<any, any>, "types">,
    Partial<Pick<GraphQLUnionTypeConfig<any, any>, "types">> {}

export type TypeOrFieldConfig =
  | ObjectConfig
  | FieldConfig
  | EnumConfig
  | UnionConfig

export interface ZodWeaverConfigOptions {
  presetGraphQLType?: (schema: Schema) => GraphQLOutputType | undefined
}

export interface ZodWeaverConfig extends WeaverConfig, ZodWeaverConfigOptions {
  [SYMBOLS.WEAVER_CONFIG]: "gqloom.zod"
}
