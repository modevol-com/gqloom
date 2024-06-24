import { type SYMBOLS, type WeaverConfig } from "@gqloom/core"
import { type GraphQLOutputType } from "graphql"
import {
  type SchemaWithPipe,
  type BaseSchema,
  type BaseIssue,
  type PipeItem,
  type SchemaWithPipeAsync,
  type BaseSchemaAsync,
  type ArraySchema,
  type ArraySchemaAsync,
  type BigintSchema,
  type BooleanSchema,
  type DateSchema,
  type Enum,
  type EnumSchema,
  type Literal,
  type LiteralSchema,
  type LooseObjectSchema,
  type LooseObjectSchemaAsync,
  type NonNullableSchema,
  type NonNullableSchemaAsync,
  type NonNullishSchema,
  type NonNullishSchemaAsync,
  type NonOptionalSchema,
  type NonOptionalSchemaAsync,
  type NullableSchema,
  type NullableSchemaAsync,
  type NullishSchema,
  type NullishSchemaAsync,
  type NumberSchema,
  type ObjectEntries,
  type ObjectEntriesAsync,
  type ObjectSchema,
  type ObjectSchemaAsync,
  type OptionalSchema,
  type OptionalSchemaAsync,
  type PicklistOptions,
  type PicklistSchema,
  type StrictObjectSchema,
  type StrictObjectSchemaAsync,
  type StringSchema,
  type UnionOptions,
  type UnionOptionsAsync,
  type UnionSchema,
  type UnionSchemaAsync,
  type VariantOptions,
  type VariantOptionsAsync,
  type VariantSchema,
  type VariantSchemaAsync,
  type GenericSchema,
  type GenericSchemaAsync,
  type UnknownSchema,
  type ObjectWithRestSchema,
  type ObjectWithRestSchemaAsync,
} from "valibot"

export type PipedSchema =
  | SchemaWithPipe<
      [
        BaseSchema<unknown, unknown, BaseIssue<unknown>>,
        ...PipeItem<unknown, unknown, BaseIssue<unknown>>[],
      ]
    >
  | SchemaWithPipeAsync<
      [
        BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>,
        ...PipeItem<unknown, unknown, BaseIssue<unknown>>[],
      ]
    >
  | BaseSchema<unknown, unknown, BaseIssue<unknown>>
  | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>

export type SupportedSchema =
  | ArraySchema<BaseSchema<unknown, unknown, BaseIssue<unknown>>, any>
  | ArraySchemaAsync<BaseSchema<unknown, unknown, BaseIssue<unknown>>, any>
  | BigintSchema<any>
  | BooleanSchema<any>
  | DateSchema<any>
  | EnumSchema<Enum, any>
  | LiteralSchema<Literal, any>
  | LooseObjectSchema<ObjectEntries, any>
  | LooseObjectSchemaAsync<ObjectEntriesAsync, any>
  | NonNullableSchema<BaseSchema<unknown, unknown, BaseIssue<unknown>>, any>
  | NonNullableSchemaAsync<
      BaseSchema<unknown, unknown, BaseIssue<unknown>>,
      any
    >
  | NonNullishSchema<BaseSchema<unknown, unknown, BaseIssue<unknown>>, any>
  | NonNullishSchemaAsync<BaseSchema<unknown, unknown, BaseIssue<unknown>>, any>
  | NonOptionalSchema<BaseSchema<unknown, unknown, BaseIssue<unknown>>, any>
  | NonOptionalSchemaAsync<
      BaseSchema<unknown, unknown, BaseIssue<unknown>>,
      any
    >
  | NullableSchema<BaseSchema<unknown, unknown, BaseIssue<unknown>>, any>
  | NullableSchemaAsync<BaseSchema<unknown, unknown, BaseIssue<unknown>>, any>
  | NullishSchema<BaseSchema<unknown, unknown, BaseIssue<unknown>>, any>
  | NullishSchemaAsync<BaseSchema<unknown, unknown, BaseIssue<unknown>>, any>
  | NumberSchema<any>
  | ObjectSchema<ObjectEntries, any>
  | ObjectSchemaAsync<ObjectEntriesAsync, any>
  | ObjectWithRestSchema<ObjectEntries, any, any>
  | ObjectWithRestSchemaAsync<ObjectEntries, any, any>
  | OptionalSchema<BaseSchema<unknown, unknown, BaseIssue<unknown>>, any>
  | OptionalSchemaAsync<BaseSchema<unknown, unknown, BaseIssue<unknown>>, any>
  | PicklistSchema<PicklistOptions, any>
  | StrictObjectSchema<ObjectEntries, any>
  | StrictObjectSchemaAsync<ObjectEntriesAsync, any>
  | StringSchema<any>
  | UnionSchema<UnionOptions, any>
  | UnionSchemaAsync<UnionOptionsAsync, any>
  | VariantSchema<string, VariantOptions<string>, any>
  | VariantSchemaAsync<string, VariantOptionsAsync<string>, any>
  | UnknownSchema

export type GenericSchemaOrAsync = GenericSchema | GenericSchemaAsync

export interface EnumLike {
  [k: string]: string | number
  [nu: number]: string
}

export interface ValibotWeaverConfigOptions {
  presetGraphQLType?: (
    schema: GenericSchema | GenericSchemaAsync
  ) => GraphQLOutputType | undefined
}

export interface ValibotWeaverConfig
  extends WeaverConfig,
    ValibotWeaverConfigOptions {
  [SYMBOLS.WEAVER_CONFIG]: "gqloom.valibot"
}
