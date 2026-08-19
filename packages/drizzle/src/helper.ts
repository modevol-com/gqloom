import {
  getResolvingFields,
  mapValue,
  pascalCase,
  type ResolverPayload,
} from "@gqloom/core"
import {
  type Column,
  getColumnTable,
  getTableColumns,
  getTableName,
  type SQL,
  sql,
  type Table,
} from "drizzle-orm"
import {
  getTableConfig as getMySQLTableConfig,
  MySqlTable,
} from "drizzle-orm/mysql-core"
import {
  getTableConfig as getPgTableConfig,
  PgTable,
} from "drizzle-orm/pg-core"
import {
  getTableConfig as getSQLiteTableConfig,
  SQLiteTable,
} from "drizzle-orm/sqlite-core"
import type { GraphQLResolveInfo } from "graphql"
import type {
  ColumnBehavior,
  DrizzleFactoryInputBehaviors,
  SelectedTableColumns,
  ValueOrGetter,
} from "./types"

/**
 * Creates an IN clause for multiple columns
 * Example: (col1, col2) IN ((val1, val2), (val3, val4))
 */
export function inArrayMultiple(
  columns: Column[],
  values: readonly unknown[][],
  table: any
): SQL<unknown> {
  // Early return for empty values
  if (values.length === 0) return sql`FALSE`

  // Create (col1, col2, ...) part
  const columnsPart = sql`(${sql.join(
    columns.map((c) => sql`${table[c.name]}`),
    sql`, `
  )})`

  // Create ((val1, val2), (val3, val4), ...) part
  const valueTuples = values.map(
    (tuple) =>
      sql`(${sql.join(
        tuple.map((v) => sql`${v}`),
        sql`, `
      )})`
  )
  const valuesPart = sql.join(valueTuples, sql`, `)

  // Combine into final IN clause
  return sql`${columnsPart} IN (${valuesPart})`
}

export function getEnumNameByColumn(column: Column): string | undefined {
  if (!column.enumValues?.length) return undefined

  const useColumnName = () =>
    `${pascalCase(getTableName(getColumnTable(column)))}${pascalCase(column.name)}Enum`
  const enumName = pgEnumNameFromColumn(column)
  if (enumName) return pascalCase(enumName)

  return useColumnName()
}

function pgEnumNameFromColumn(column: Column): string | undefined {
  const fromColumn = enumNameFromUnknown(Reflect.get(column, "enum"))
  if (fromColumn) return fromColumn

  const config = Reflect.get(column, "config")
  if (!isObjectOrFunction(config)) return undefined
  return enumNameFromUnknown(Reflect.get(config, "enum"))
}

function enumNameFromUnknown(value: unknown): string | undefined {
  if (!isObjectOrFunction(value)) return undefined
  const enumName = Reflect.get(value, "enumName")
  return typeof enumName === "string" ? enumName : undefined
}

function isObjectOrFunction(value: unknown): value is object {
  return (
    value != null && (typeof value === "object" || typeof value === "function")
  )
}

export function isColumnVisible(
  columnName: string,
  options: DrizzleFactoryInputBehaviors<Table>,
  behavior: keyof ColumnBehavior<any>
): boolean {
  // Get specific column configuration
  const columnConfig = options?.[columnName as keyof typeof options]
  // Get table default configuration
  const defaultConfig = options?.["*"]
  if (columnConfig != null) {
    if (typeof columnConfig === "boolean") {
      return columnConfig
    }
    if (!("~standard" in columnConfig)) {
      const specificBehavior = columnConfig[behavior]
      if (specificBehavior != null) {
        return specificBehavior !== false
      }
    }
  }

  if (defaultConfig != null) {
    if (typeof defaultConfig === "boolean") {
      return defaultConfig
    }
    const defaultBehavior = defaultConfig[behavior]
    if (defaultBehavior != null) {
      return defaultBehavior !== false
    }
  }

  // Default to visible
  return true
}

export function getValue<T>(valueOrGetter: ValueOrGetter<T>): T {
  return typeof valueOrGetter === "function"
    ? (valueOrGetter as () => T)()
    : valueOrGetter
}

/**
 * Get the selected columns from the resolver payload
 * @param table - The table to get the selected columns from
 * @param payload - The resolver payload
 * @returns The selected columns
 */
export function getSelectedColumns<TTable extends Table>(
  table: TTable,
  payload: ResolverPayload | (ResolverPayload | undefined)[] | undefined
): SelectedTableColumns<TTable> {
  if (
    !payload ||
    (Array.isArray(payload) && payload.filter(Boolean).length === 0)
  ) {
    return getTableColumns(table) as SelectedTableColumns<TTable>
  }
  let selectedFields = new Set<string>()
  if (Array.isArray(payload)) {
    for (const p of payload) {
      if (p) {
        const resolvingFields = getResolvingFields(p)
        for (const field of resolvingFields.selectedFields)
          selectedFields.add(field)
      }
    }
  } else {
    const resolvingFields = getResolvingFields(payload)
    selectedFields = new Set(resolvingFields.selectedFields)
  }
  return mapValue(getTableColumns(table), (column, columnName) => {
    if (selectedFields.has(columnName)) return column
    return mapValue.SKIP
  }) as SelectedTableColumns<TTable>
}

const tablePrimaryKeys = new WeakMap<Table, [key: string, column: Column][]>()

export function getPrimaryColumns(
  table: Table
): [key: string, column: Column][] {
  const cached = tablePrimaryKeys.get(table)
  if (cached) return cached
  let primaryColumns = Object.entries(getTableColumns(table)).filter(
    ([_, col]) => col.primary
  )
  if (primaryColumns.length === 0) {
    let primaryKey
    if (table instanceof SQLiteTable) {
      primaryKey = getSQLiteTableConfig(table).primaryKeys[0]
    } else if (table instanceof MySqlTable) {
      primaryKey = getMySQLTableConfig(table).primaryKeys[0]
    } else if (table instanceof PgTable) {
      primaryKey = getPgTableConfig(table).primaryKeys[0]
    }
    const colToKey = new Map<string, string>(
      Object.entries(getTableColumns(table)).map(([key, col]) => [
        col.name,
        key,
      ])
    )
    const cols = new Map<string, Column>(
      Object.values(getTableColumns(table)).map((col) => [col.name, col])
    )

    if (primaryKey) {
      primaryColumns = primaryKey.columns.map((col) => [
        colToKey.get(col.name)!,
        cols.get(col.name)!,
      ])
    }
  }
  if (primaryColumns.length === 0) {
    throw new Error(`No primary key found for table ${getTableName(table)}`)
  }
  tablePrimaryKeys.set(table, primaryColumns)
  return primaryColumns
}

export function getParentPath(info: GraphQLResolveInfo): string {
  let path = ""
  let prev = info.path.prev
  while (prev) {
    path = path ? `${pathKey(prev)}.${path}` : pathKey(prev)
    prev = prev.prev
  }
  return path
}

export function pathKey(path: GraphQLResolveInfo["path"]): string {
  return typeof path.key === "number" ? `[n]` : path.key
}
