import {
  type GraphQLSilk,
  SYMBOLS,
  type StandardSchemaV1,
  mapValue,
  pascalCase,
  silk,
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
import { PgInteger, PgSerial } from "drizzle-orm/pg-core"
import { SQLiteInteger } from "drizzle-orm/sqlite-core"
import {
  type GraphQLFieldConfig,
  GraphQLFloat,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLObjectType,
  type GraphQLOutputType,
  GraphQLString,
} from "graphql"

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
    const name = pascalCase(getTableName(table))
    const columns = getTableColumns(table)
    return new GraphQLNonNull(
      new GraphQLObjectType({
        name,
        fields: mapValue(columns, (value) => {
          const type = DrizzleWeaver.getColumnType(value)
          if (type == null) return mapValue.SKIP
          return { type }
        }),
      })
    )
  }

  static getColumnConfig(column: Column): GraphQLFieldConfig<any, any> | null {
    const type = DrizzleWeaver.getColumnType(column)
    if (type == null) return null
    return { type }
  }

  static getColumnType(column: Column): GraphQLOutputType | undefined {
    switch (column.dataType) {
      case "number": {
        return is(column, PgInteger) ||
          is(column, PgSerial) ||
          is(column, MySqlInt) ||
          is(column, MySqlSerial) ||
          is(column, SQLiteInteger)
          ? GraphQLInt
          : GraphQLFloat
      }
      case "string": {
        return GraphQLString
      }
      default: {
        throw new Error(`Type: ${column.columnType} is not implemented!`)
      }
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
