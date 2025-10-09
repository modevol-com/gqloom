import type { SYMBOLS, WeaverConfig } from "@gqloom/core"
import type {
  GraphQLEnumTypeConfig,
  GraphQLEnumValueConfig,
  GraphQLFieldConfig,
  GraphQLInterfaceType,
  GraphQLObjectTypeConfig,
  GraphQLOutputType,
  GraphQLUnionTypeConfig,
} from "graphql"
import type { $ZodObject, $ZodType } from "zod/v4/core"

export interface LooseZodObject extends Pick<$ZodObject, "~standard"> {
  _zod: Omit<
    $ZodObject<any, any>["_zod"],
    "def" | "parent" | "parse" | "run" | "toJSONSchema"
  >
}

export interface ObjectConfig
  extends Omit<
      GraphQLObjectTypeConfig<any, any>,
      "fields" | "name" | "interfaces"
    >,
    Partial<Pick<GraphQLObjectTypeConfig<any, any>, "fields" | "name">> {
  interfaces?: (LooseZodObject | GraphQLInterfaceType)[]
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

export interface ZodWeaverConfigOptions {
  presetGraphQLType?: (schema: $ZodType) => GraphQLOutputType | undefined
}

export interface ZodWeaverConfig extends WeaverConfig, ZodWeaverConfigOptions {
  [SYMBOLS.WEAVER_CONFIG]: "gqloom.zod"
}
