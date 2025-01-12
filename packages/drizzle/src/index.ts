import {
  type GraphQLSilk,
  SYMBOLS,
  type StandardSchemaV1,
  mapValue,
  pascalCase,
  silk,
  weaverContext,
} from "@gqloom/core"
import {
  type Column,
  type InferSelectModel,
  type Table,
  getTableColumns,
  getTableName,
  is,
} from "drizzle-orm"
import { MySqlInt, MySqlSerial } from "drizzle-orm/mysql-core"
import { type PgArray, PgInteger, PgSerial } from "drizzle-orm/pg-core"
import { SQLiteInteger } from "drizzle-orm/sqlite-core"
import {
  GraphQLBoolean,
  type GraphQLFieldConfig,
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  type GraphQLOutputType,
  GraphQLString,
  isNonNullType,
} from "graphql"
import type { DrizzleWeaverConfig, DrizzleWeaverConfigOptions } from "./types"

export class DrizzleWeaver {
  static vendor = "gqloom.drizzle"

  /**
   * get GraphQL Silk from drizzle table
   * @param table drizzle table
   * @returns GraphQL Silk Like drizzle table
   */
  static unravel<TTable extends Table>(table: TTable): TableSilk<TTable> {
    Object.defineProperty(table, "~standard", {
      value: {
        version: 1,
        vendor: DrizzleWeaver.vendor,
        validate: (value: unknown) => ({
          value: value as InferSelectModel<TTable>,
        }),
      } satisfies StandardSchemaV1.Props<InferSelectModel<TTable>, unknown>,
      enumerable: false,
      writable: true,
      configurable: true,
    })

    Object.defineProperty(table, SYMBOLS.GET_GRAPHQL_TYPE, {
      value: DrizzleWeaver.getGraphQLTypeBySelf,
      enumerable: false,
      writable: true,
      configurable: true,
    })

    Object.defineProperty(table, "$nullable", {
      value: function () {
        return silk.nullable(this as unknown as GraphQLSilk)
      },
      enumerable: false,
      writable: true,
      configurable: true,
    })

    Object.defineProperty(table, "$list", {
      value: function () {
        return silk.list(this as unknown as GraphQLSilk) as GraphQLSilk<
          InferSelectModel<TTable>[]
        >
      },
      enumerable: false,
      writable: true,
      configurable: true,
    })

    return table as TableSilk<TTable>
  }

  static getGraphQLTypeBySelf(this: Table): GraphQLOutputType {
    return DrizzleWeaver.getGraphQLType(this)
  }

  static getGraphQLType(table: Table): GraphQLNonNull<GraphQLObjectType> {
    const name = `${pascalCase(getTableName(table))}Item`

    const existing = weaverContext.getNamedType(name)
    if (existing != null)
      return new GraphQLNonNull(existing as GraphQLObjectType)

    const columns = getTableColumns(table)
    return new GraphQLNonNull(
      weaverContext.memoNamedType(
        new GraphQLObjectType({
          name,
          fields: mapValue(columns, (value) => {
            return DrizzleWeaver.getFieldConfig(value)
          }),
        })
      )
    )
  }

  static getFieldConfig(column: Column): GraphQLFieldConfig<any, any> {
    let type = DrizzleWeaver.getColumnType(column)

    if (column.notNull && !isNonNullType(type)) {
      type = new GraphQLNonNull(type)
    }
    return { type }
  }

  static getColumnType(column: Column): GraphQLOutputType {
    const config =
      weaverContext.getConfig<DrizzleWeaverConfig>("gqloom.drizzle")

    const presetType = config?.presetGraphQLType?.(column)
    if (presetType) return presetType

    switch (column.dataType) {
      case "boolean": {
        return GraphQLBoolean
      }
      case "number": {
        return is(column, PgInteger) ||
          is(column, PgSerial) ||
          is(column, MySqlInt) ||
          is(column, MySqlSerial) ||
          is(column, SQLiteInteger)
          ? GraphQLInt
          : GraphQLFloat
      }
      case "json":
      case "date":
      case "bigint":
      case "string": {
        return GraphQLString
      }
      case "buffer": {
        return new GraphQLList(new GraphQLNonNull(GraphQLInt))
      }
      case "array": {
        if ("baseColumn" in column) {
          const innerType = DrizzleWeaver.getColumnType(
            (column as Column as PgArray<any, any>).baseColumn
          )
          return new GraphQLList(new GraphQLNonNull(innerType))
        }
        throw new Error(`Type: ${column.columnType} is not implemented!`)
      }
      default: {
        throw new Error(`Type: ${column.columnType} is not implemented!`)
      }
    }
  }

  static config(config: DrizzleWeaverConfigOptions): DrizzleWeaverConfig {
    return {
      ...config,
      [SYMBOLS.WEAVER_CONFIG]: "gqloom.drizzle",
    }
  }
}

/**
 * get GraphQL Silk from drizzle table
 * @param table drizzle table
 * @returns GraphQL Silk Like drizzle table
 */
export function drizzleSilk<TTable extends Table>(
  table: TTable
): TableSilk<TTable> {
  return DrizzleWeaver.unravel(table)
}

export type TableSilk<TTable extends Table> = TTable &
  GraphQLSilk<InferSelectModel<TTable>, InferSelectModel<TTable>> & {
    $nullable: () => GraphQLSilk<
      InferSelectModel<TTable> | null | undefined,
      InferSelectModel<TTable> | null | undefined
    >
    $list: () => GraphQLSilk<
      InferSelectModel<TTable>[],
      InferSelectModel<TTable>[]
    >
  }

export * from "./input-factory"
