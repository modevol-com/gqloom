import type { WeaverConfig } from "@gqloom/core"
// biome-ignore lint/correctness/noUnusedImports: SYMBOLS used in type
import type { SYMBOLS } from "@gqloom/core"
import type {
  $ZodInterface,
  $ZodLooseShape,
  $ZodObject,
  $ZodShape,
  $ZodType,
} from "@zod/core"
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
  interfaces?: (
    | $ZodInterface<$ZodLooseShape>
    | $ZodObject<$ZodShape>
    | GraphQLInterfaceType
  )[]
  [k: string]: unknown
}

export interface FieldConfig
  extends Partial<Omit<GraphQLFieldConfig<any, any>, "type">> {
  type?: GraphQLOutputType | undefined | null

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
