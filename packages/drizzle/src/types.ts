import { type GraphQLSilk, SYMBOLS, type WeaverConfig } from "@gqloom/core"
import type {
  Column,
  InferInsertModel,
  InferSelectModel,
  SQL,
  Table,
} from "drizzle-orm"
import type {
  GraphQLFieldConfig,
  GraphQLObjectTypeConfig,
  GraphQLOutputType,
} from "graphql"

/**
 * Config options for DrizzleWeaver
 */
export interface DrizzleWeaverConfigOptions {
  presetGraphQLType?: (column: Column) => GraphQLOutputType | undefined
}

/**
 * Config for DrizzleWeaver
 */
export interface DrizzleWeaverConfig
  extends WeaverConfig,
    DrizzleWeaverConfigOptions {
  [SYMBOLS.WEAVER_CONFIG]: "gqloom.drizzle"
}

/**
 * Options for DrizzleResolverFactory
 */
export interface DrizzleResolverFactoryOptions<TTable extends Table> {
  /**
   * Config the behavior of the columns
   */
  input: DrizzleFactoryInputBehaviors<TTable>
}

export interface ColumnBehavior<TOutput> {
  /**
   * Is this column visible in the filters?
   */
  filters?: boolean

  /**
   * Is this column visible in the insert mutation input?
   */
  insert?: boolean | GraphQLSilk<TOutput, any>
  /**
   * Is this column visible in the update mutation input?
   */
  update?: boolean | GraphQLSilk<TOutput, any>
}

export type DrizzleFactoryInputBehaviors<TTable extends Table> = {
  [K in keyof TTable["_"]["columns"]]?:
    | ColumnBehavior<
        InferInsertModel<TTable>[Extract<K, keyof InferInsertModel<TTable>>]
      >
    | GraphQLSilk<
        InferInsertModel<TTable>[Extract<K, keyof InferInsertModel<TTable>>],
        any
      >
    | boolean
    | undefined
} & {
  /**
   * Config the default visibility behavior of all columns
   */
  "*"?: ColumnBehavior<never> | boolean | undefined
}

export type DrizzleSilkFieldType =
  | GraphQLOutputType
  | GraphQLSilk<any, any>
  | typeof SYMBOLS.FIELD_HIDDEN
  | null

/**
 * A `drizzleSilk` field override: GraphQL type, Silk (Zod / Valibot / `silk()`),
 * field config object, or `FIELD_HIDDEN`.
 */
export type DrizzleSilkFieldConfig =
  | (Omit<GraphQLFieldConfig<any, any>, "type"> & {
      /**
       * The type of the field, set to `null` to hide the field.
       * Accepts a GraphQL output type, a Silk, or a getter of either.
       */
      type?: ValueOrGetter<DrizzleSilkFieldType> | undefined
    })
  | GraphQLSilk<any, any>
  | GraphQLOutputType
  | typeof SYMBOLS.FIELD_HIDDEN
  | undefined

export interface ResolvedDrizzleFieldConfig {
  hidden: boolean
  type: GraphQLOutputType | undefined
  options: Omit<GraphQLFieldConfig<any, any>, "type">
}

export interface DrizzleSilkConfig<TTable extends Table>
  extends Partial<Omit<GraphQLObjectTypeConfig<any, any>, "fields">> {
  fields?: ValueOrGetter<{
    [K in keyof TTable["_"]["columns"]]?: DrizzleSilkFieldConfig
  }>
}

export type HideFields<TConfig extends DrizzleSilkConfig<any>> =
  UnwrapGetter<TConfig["fields"]> extends Record<string | number | symbol, any>
    ? {
        [K in keyof UnwrapGetter<TConfig["fields"]>]: UnwrapGetter<
          TConfig["fields"]
        >[K] extends typeof SYMBOLS.FIELD_HIDDEN
          ? K
          : never
      }[keyof UnwrapGetter<TConfig["fields"]>]
    : never

export type ValueOrGetter<T> = T | (() => T)

export type UnwrapGetter<T> = T extends (...args: any) => infer R ? R : T

export type SelectedTableColumns<TTable extends Table> = Partial<
  TTable["_"]["columns"]
> & {
  /**
   * This is a brand for the selected fields, used to indicate that the fields are selected by GraphQL Query.
   */
  [K in `__selective_${TTable["_"]["name"]}_brand__`]: SQL<never>
}

export type SelectiveTable<
  TTable extends Table,
  THideFields extends string | number | symbol = never,
> =
  | Omit<InferSelectModel<TTable>, THideFields>
  | (Partial<InferSelectModel<TTable>> & {
      /**
       * This is a brand for the selected fields, used to indicate that the fields are selected by GraphQL Query.
       */
      [K in `__selective_${TTable["_"]["name"]}_brand__`]: never
    })
