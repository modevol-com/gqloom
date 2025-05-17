import {
  type GraphQLSilk,
  SYMBOLS,
  type StandardSchemaV1,
  mapValue,
  pascalCase,
  screamingSnakeCase,
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
  GraphQLEnumType,
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  type GraphQLOutputType,
  GraphQLString,
  isNonNullType,
} from "graphql"
import { getEnumNameByColumn, getValue } from "./helper"
import type {
  DrizzleSilkConfig,
  DrizzleWeaverConfig,
  DrizzleWeaverConfigOptions,
  SelectiveTable,
} from "./types"

export class DrizzleWeaver {
  public static vendor = "gqloom.drizzle"

  /**
   * get GraphQL Silk from drizzle table
   * @param table drizzle table
   * @returns GraphQL Silk Like drizzle table
   */
  public static unravel<TTable extends Table>(
    table: TTable
  ): TableSilk<TTable> {
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

  public static getGraphQLTypeBySelf(this: Table): GraphQLOutputType {
    return DrizzleWeaver.getGraphQLType(this)
  }

  public static getGraphQLType(
    table: Table
  ): GraphQLNonNull<GraphQLObjectType> {
    const config = DrizzleWeaver.silkConfigs.get(table)
    const name = config?.name ?? `${pascalCase(getTableName(table))}Item`

    const existing = weaverContext.getNamedType(name)
    if (existing != null) {
      return new GraphQLNonNull(existing as GraphQLObjectType)
    }

    const fieldsConfig = getValue(config?.fields) ?? {}

    const columns = getTableColumns(table)
    return new GraphQLNonNull(
      weaverContext.memoNamedType(
        new GraphQLObjectType({
          name,
          ...config,
          fields: mapValue(columns, (column, columnName) => {
            const fieldConfig = fieldsConfig[columnName]
            const fieldType = getValue(fieldConfig?.type)
            let type = fieldType ?? DrizzleWeaver.getColumnType(column)

            if (fieldType === null) return mapValue.SKIP

            if (column.notNull && !isNonNullType(type)) {
              type = new GraphQLNonNull(type)
            }
            return { ...fieldConfig, type }
          }),
        })
      )
    )
  }

  public static getColumnType(column: Column): GraphQLOutputType {
    const config =
      weaverContext.getConfig<DrizzleWeaverConfig>("gqloom.drizzle")

    const presetType = config?.presetGraphQLType?.(column)
    if (presetType) return presetType

    const enumName = getEnumNameByColumn(column)
    if (enumName && column.enumValues) {
      const existing = weaverContext.getNamedType(enumName)
      if (existing != null) return existing

      return weaverContext.memoNamedType(
        new GraphQLEnumType({
          name: enumName,
          values: Object.fromEntries(
            column.enumValues.map((value) => [
              screamingSnakeCase(value),
              { value: value },
            ])
          ),
        })
      )
    }

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

  public static config(
    config: DrizzleWeaverConfigOptions
  ): DrizzleWeaverConfig {
    return {
      ...config,
      [SYMBOLS.WEAVER_CONFIG]: "gqloom.drizzle",
    }
  }

  public static silkConfigs = new WeakMap<Table, DrizzleSilkConfig<Table>>()
}

/**
 * get GraphQL Silk from drizzle table
 * @param table drizzle table
 * @returns GraphQL Silk Like drizzle table
 */
export function drizzleSilk<TTable extends Table>(
  table: TTable,
  config?: DrizzleSilkConfig<TTable>
): TableSilk<TTable> {
  if (config) DrizzleWeaver.silkConfigs.set(table, config)
  return DrizzleWeaver.unravel(table)
}

export type TableSilk<TTable extends Table> = TTable &
  SilkVariant<GraphQLSilk<SelectiveTable<TTable>, SelectiveTable<TTable>>>

export type SilkVariant<TSilk extends GraphQLSilk<unknown, unknown>> =
  TSilk extends GraphQLSilk<infer TOutput, infer TInput>
    ? GraphQLSilk<TOutput, TInput> & {
        $nullable: () => GraphQLSilk<
          TOutput | null | undefined,
          TInput | null | undefined
        >
        $list: () => GraphQLSilk<TOutput[], TInput[]>
      }
    : never

export * from "./factory"
export * from "./types"
