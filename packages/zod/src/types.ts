import type { GraphQLSilk, SYMBOLS, WeaverConfig } from "@gqloom/core"
import type {
  GraphQLEnumTypeConfig,
  GraphQLEnumValueConfig,
  GraphQLFieldConfig,
  GraphQLInterfaceType,
  GraphQLObjectTypeConfig,
  GraphQLOutputType,
  GraphQLUnionTypeConfig,
} from "graphql"
import type { $ZodType, GlobalMeta } from "zod/v4/core"
import type { ZodWeaver } from "."

export interface ObjectConfig
  extends Omit<
      GraphQLObjectTypeConfig<any, any>,
      "fields" | "name" | "interfaces"
    >,
    Partial<Pick<GraphQLObjectTypeConfig<any, any>, "fields" | "name">> {
  interfaces?: (GraphQLSilk | GraphQLInterfaceType)[]
  [k: string]: unknown
}

export interface FieldConfig
  extends Partial<Omit<GraphQLFieldConfig<any, any>, "type">> {
  type?: GraphQLOutputType | undefined | null | typeof SYMBOLS.FIELD_HIDDEN

  [k: string]: unknown
}

export interface EnumConfig<TKey = string>
  extends Partial<GraphQLEnumTypeConfig> {
  valuesConfig?: TKey extends string
    ? Partial<Record<TKey, GraphQLEnumValueConfig>>
    : Partial<Record<string, GraphQLEnumValueConfig>>
  [k: string]: unknown
}

export interface UnionConfig
  extends Omit<GraphQLUnionTypeConfig<any, any>, "name" | "types">,
    Partial<Pick<GraphQLUnionTypeConfig<any, any>, "types">> {
  [k: string]: unknown
}

export interface ZodWeaverConfigOptions {
  /**
   * Optionally override the auto-inferred GraphQL output type for a given Zod schema.
   */
  presetGraphQLType?: (schema: $ZodType) => GraphQLOutputType | undefined

  /**
   * Derive GraphQL object type config (name, description, interfaces, extensions, etc.) from global Zod meta.
   */
  metaToObjectConfig?: (meta: GlobalMeta) => ObjectConfig | undefined

  /**
   * Derive GraphQL field config (description, deprecation, extensions, etc.) from global Zod meta.
   */
  metaToFieldConfig?: (meta: GlobalMeta) => FieldConfig | undefined

  /**
   * Derive GraphQL enum config (values metadata, description, extensions, etc.) from global Zod meta.
   */
  metaToEnumConfig?: (meta: GlobalMeta) => EnumConfig | undefined

  /**
   * Derive GraphQL union config (description, resolveType hints, extensions, etc.) from global Zod meta.
   */
  metaToUnionConfig?: (meta: GlobalMeta) => UnionConfig | undefined
}

export interface ZodWeaverConfig extends WeaverConfig, ZodWeaverConfigOptions {
  [SYMBOLS.WEAVER_CONFIG]: "gqloom.zod"
  vendorWeaver: typeof ZodWeaver
}
