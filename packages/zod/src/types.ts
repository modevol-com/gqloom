import { type SYMBOLS, type WeaverConfig } from "@gqloom/core"
import {
  type GraphQLUnionTypeConfig,
  type GraphQLEnumTypeConfig,
  type GraphQLFieldConfig,
  type GraphQLObjectTypeConfig,
  type GraphQLInterfaceType,
  type GraphQLOutputType,
} from "graphql"
import { type Schema, type ZodObject, type ZodRawShape } from "zod"

export interface ObjectConfig
  extends Omit<
      GraphQLObjectTypeConfig<any, any>,
      "fields" | "name" | "interfaces"
    >,
    Partial<Pick<GraphQLObjectTypeConfig<any, any>, "fields" | "name">> {
  interfaces?: (ZodObject<ZodRawShape> | GraphQLInterfaceType)[]
}

export interface FieldConfig extends Partial<GraphQLFieldConfig<any, any>> {}

export interface EnumConfig
  extends Omit<GraphQLEnumTypeConfig, "values">,
    Partial<Pick<GraphQLEnumTypeConfig, "values">> {}

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
