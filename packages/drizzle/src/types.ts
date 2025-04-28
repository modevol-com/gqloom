import { SYMBOLS, type WeaverConfig } from "@gqloom/core"
import type { Column, Table } from "drizzle-orm"
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
   * Config the visibility behavior of the columns
   */
  input: DrizzleFactoryInputVisibilityBehaviors<TTable>
}

export interface VisibilityBehavior {
  /**
   * Is this column visible in the filters?
   */
  filters?: boolean

  /**
   * Is this column visible in the insert mutation input?
   */
  insert?: boolean
  /**
   * Is this column visible in the update mutation input?
   */
  update?: boolean
}

export type DrizzleFactoryInputVisibilityBehaviors<TTable extends Table> = {
  [K in keyof TTable["_"]["columns"]]?: VisibilityBehavior | boolean | undefined
} & {
  /**
   * Config the default visibility behavior of all columns
   */
  "*"?: VisibilityBehavior | boolean | undefined
}

export interface DrizzleSilkConfig<TTable extends Table>
  extends Partial<Omit<GraphQLObjectTypeConfig<any, any>, "fields">> {
  fields?: ValueOrGetter<{
    [K in keyof TTable["_"]["columns"]]?:
      | (Omit<GraphQLFieldConfig<any, any>, "type"> & {
          /**
           * The type of the field, set to `null` to hide the field
           */
          type?: GraphQLOutputType | null | undefined
        })
      | undefined
  }>
}

export type ValueOrGetter<T> = T | (() => T)
