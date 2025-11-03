import type { SYMBOLS, WeaverConfig } from "@gqloom/core"
import type * as Schema from "effect/Schema"
import type {
  GraphQLEnumTypeConfig,
  GraphQLEnumValueConfig,
  GraphQLFieldConfig,
  GraphQLInterfaceType,
  GraphQLObjectTypeConfig,
  GraphQLOutputType,
  GraphQLUnionTypeConfig,
} from "graphql"

export interface ObjectConfig
  extends Omit<
      GraphQLObjectTypeConfig<any, any>,
      "fields" | "name" | "interfaces"
    >,
    Partial<Pick<GraphQLObjectTypeConfig<any, any>, "fields" | "name">> {
  interfaces?: (Schema.Schema.Any | GraphQLInterfaceType)[]
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
  extends Omit<GraphQLUnionTypeConfig<any, any>, "types">,
    Partial<Pick<GraphQLUnionTypeConfig<any, any>, "types">> {
  [k: string]: unknown
}

export interface EffectWeaverConfigOptions {
  presetGraphQLType?: (
    schema: Schema.Schema.Any
  ) => GraphQLOutputType | undefined
}

export interface EffectWeaverConfig
  extends WeaverConfig,
    EffectWeaverConfigOptions {
  [SYMBOLS.WEAVER_CONFIG]: "gqloom.effect"
}
