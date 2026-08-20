import {
  type GraphQLSilk,
  isSilk,
  mapValue,
  pascalCase,
  type StandardSchemaV1,
  SYMBOLS,
  screamingSnakeCase,
  silk,
  weaverContext,
} from "@gqloom/core"
import {
  type Column,
  extractExtendedColumnType,
  getTableColumns,
  getTableName,
  type InferSelectModel,
  is,
  type Table,
} from "drizzle-orm"
import { MySqlInt, MySqlSerial } from "drizzle-orm/mysql-core"
import { PgInteger, PgSerial } from "drizzle-orm/pg-core"
import { SQLiteInteger } from "drizzle-orm/sqlite-core"
import {
  GraphQLBoolean,
  GraphQLEnumType,
  type GraphQLFieldConfig,
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  type GraphQLOutputType,
  GraphQLString,
  isNonNullType,
  isOutputType,
} from "graphql"
import { getEnumNameByColumn, getValue } from "./helper"
import type {
  DrizzleSilkConfig,
  DrizzleSilkFieldConfig,
  DrizzleWeaverConfig,
  DrizzleWeaverConfigOptions,
  HideFields,
  ResolvedDrizzleFieldConfig,
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
    let compiledValidate:
      | StandardSchemaV1.Props<unknown, unknown>["validate"]
      | undefined
    Object.defineProperty(table, "~standard", {
      value: {
        version: 1,
        vendor: DrizzleWeaver.vendor,
        validate: (value: unknown) => {
          compiledValidate ??= DrizzleWeaver.compileValidator(
            DrizzleWeaver.silkConfigs.get(table)
          )
          return compiledValidate(value)
        },
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

    const { fields: _fields, ...objectConfig } = config ?? {}
    const fieldsConfig = getValue(config?.fields) ?? {}

    const columns = getTableColumns(table)
    return new GraphQLNonNull(
      weaverContext.memoNamedType(
        new GraphQLObjectType({
          name,
          ...objectConfig,
          fields: mapValue(columns, (column, columnName) => {
            const resolved = DrizzleWeaver.resolveFieldConfig(
              fieldsConfig[columnName]
            )
            if (resolved.hidden) return mapValue.SKIP

            const type = DrizzleWeaver.applyColumnNullability(
              resolved.type ?? DrizzleWeaver.getColumnType(column),
              column.notNull
            )
            return { ...resolved.options, type }
          }),
        })
      )
    )
  }

  /**
   * Align output/input nullability with the column: required → NonNull, optional → nullable.
   */
  public static applyColumnNullability(
    type: GraphQLOutputType,
    notNull: boolean
  ): GraphQLOutputType {
    const ofType = isNonNullType(type) ? type.ofType : type
    return notNull ? new GraphQLNonNull(ofType) : ofType
  }

  /**
   * Normalize a `drizzleSilk` field override to GraphQL type, hidden flag, and field options.
   */
  public static resolveFieldConfig(
    fieldConfig: DrizzleSilkFieldConfig
  ): ResolvedDrizzleFieldConfig {
    if (fieldConfig == null) {
      return { hidden: false, type: undefined, options: {} }
    }
    if (fieldConfig === SYMBOLS.FIELD_HIDDEN) {
      return { hidden: true, type: undefined, options: {} }
    }
    if (isSilk(fieldConfig)) {
      return {
        hidden: false,
        type: silk.getType(fieldConfig),
        options: {},
      }
    }
    if (isOutputType(fieldConfig)) {
      return { hidden: false, type: fieldConfig, options: {} }
    }

    const { type: typeGetter, ...options } = fieldConfig as {
      type?: unknown
    } & Omit<GraphQLFieldConfig<any, any>, "type">
    const rawType = getValue(typeGetter as Parameters<typeof getValue>[0])
    if (rawType === null || rawType === SYMBOLS.FIELD_HIDDEN) {
      return { hidden: true, type: undefined, options: {} }
    }
    if (isSilk(rawType)) {
      return { hidden: false, type: silk.getType(rawType), options }
    }
    if (rawType == null) {
      return { hidden: false, type: undefined, options }
    }
    return { hidden: false, type: rawType as GraphQLOutputType, options }
  }

  /**
   * Extract a Silk from a field override for validation (does not resolve GraphQL types).
   */
  public static getFieldSilk(
    fieldConfig: DrizzleSilkFieldConfig
  ): GraphQLSilk<any, any> | undefined {
    if (fieldConfig == null || fieldConfig === SYMBOLS.FIELD_HIDDEN) {
      return undefined
    }
    if (isSilk(fieldConfig)) return fieldConfig
    if (isOutputType(fieldConfig)) return undefined
    const rawType = (fieldConfig as { type?: unknown }).type
    if (isSilk(rawType)) return rawType
    if (typeof rawType === "function") {
      try {
        const resolved = (rawType as () => unknown)()
        if (isSilk(resolved)) return resolved
      } catch {
        return undefined
      }
    }
    return undefined
  }

  /**
   * Compile a validate function from config.fields: each field with a Silk
   * (`~standard.validate`) is validated; issues get path prefixed with the field key.
   */
  public static compileValidator(
    config?: DrizzleSilkConfig<any>
  ): StandardSchemaV1.Props<unknown, unknown>["validate"] {
    const rawFields =
      config?.fields == null
        ? undefined
        : typeof config.fields === "function"
          ? config.fields()
          : config.fields

    if (rawFields == null || typeof rawFields !== "object") {
      return (value: unknown) => ({ value })
    }

    const validators = new Map<
      string,
      StandardSchemaV1.Props<unknown, unknown>["validate"]
    >()
    for (const key of Object.keys(rawFields)) {
      const fieldSilk = DrizzleWeaver.getFieldSilk(
        (rawFields as Record<string, DrizzleSilkFieldConfig>)[key]
      )
      const validate = fieldSilk?.["~standard"]?.validate
      if (typeof validate === "function") validators.set(key, validate)
    }

    if (validators.size === 0) {
      return (value: unknown) => ({ value })
    }

    return async (value: unknown) => {
      if (value == null || typeof value !== "object") return { value }
      const valueObj = value as Record<string, unknown>
      const entries = Array.from(validators.entries()).filter(
        ([key]) => key in valueObj
      )
      if (entries.length === 0) return { value: valueObj }

      const results = await Promise.all(
        entries.map(async ([key, validateFn]) => ({
          key,
          fieldResult: await validateFn(valueObj[key]),
        }))
      )

      const result = { ...valueObj }
      const issues: StandardSchemaV1.Issue[] = []
      for (const { key, fieldResult } of results) {
        if (fieldResult.issues) {
          for (const issue of fieldResult.issues) {
            issues.push({ ...issue, path: [key, ...(issue.path ?? [])] })
          }
        } else if ("value" in fieldResult) {
          result[key] = fieldResult.value
        }
      }
      if (issues.length > 0) return { issues }
      return { value: result }
    }
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

    const { type, constraint } = extractExtendedColumnType(column)
    let gqlType: GraphQLOutputType

    switch (type) {
      case "boolean": {
        gqlType = GraphQLBoolean
        break
      }
      case "number": {
        const isInt =
          constraint != null
            ? constraint !== "double" &&
              constraint !== "float" &&
              constraint !== "udouble" &&
              constraint !== "ufloat"
            : is(column, PgInteger) ||
              is(column, PgSerial) ||
              is(column, MySqlInt) ||
              is(column, MySqlSerial) ||
              is(column, SQLiteInteger)
        gqlType = isInt ? GraphQLInt : GraphQLFloat
        break
      }
      case "bigint":
      case "string":
      case "custom": {
        gqlType = GraphQLString
        break
      }
      case "object": {
        gqlType =
          constraint === "buffer"
            ? new GraphQLList(new GraphQLNonNull(GraphQLInt))
            : GraphQLString
        break
      }
      case "array": {
        gqlType = new GraphQLList(new GraphQLNonNull(GraphQLFloat))
        break
      }
      default: {
        throw new Error(`Type: ${column.columnType} is not implemented!`)
      }
    }

    const dimensions =
      "dimensions" in column && typeof column.dimensions === "number"
        ? column.dimensions
        : 0
    for (let i = 0; i < dimensions; i++) {
      gqlType = new GraphQLList(new GraphQLNonNull(gqlType))
    }
    return gqlType
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
export function drizzleSilk<
  TTable extends Table,
  const TConfig extends DrizzleSilkConfig<TTable>,
>(table: TTable, config?: TConfig): TableSilk<TTable, HideFields<TConfig>> {
  if (config) DrizzleWeaver.silkConfigs.set(table, config)
  return DrizzleWeaver.unravel(table)
}

export type TableSilk<
  TTable extends Table,
  THideFields extends string | number | symbol = never,
> = TTable &
  SilkVariant<
    GraphQLSilk<
      SelectiveTable<TTable, THideFields>,
      SelectiveTable<TTable, THideFields>
    >
  >

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
