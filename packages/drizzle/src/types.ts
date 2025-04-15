import { SYMBOLS, type WeaverConfig } from "@gqloom/core"
import type { Column, Table } from "drizzle-orm"
import type { GraphQLOutputType } from "graphql"

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
  column: DrizzleFactoryOptionsColumn<TTable>
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

export type DrizzleFactoryOptionsColumn<TTable extends Table> = {
  [K in keyof TTable["_"]["columns"]]?: VisibilityBehavior | undefined
} & {
  /**
   * Config the default visibility behavior of all columns
   */
  "*"?: VisibilityBehavior | undefined
}
