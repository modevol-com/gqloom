import {
  type ResolverPayload,
  getResolvingFields,
  mapValue,
  pascalCase,
} from "@gqloom/core"
import {
  type Column,
  type SQL,
  type Table,
  getTableColumns,
  getTableName,
  sql,
} from "drizzle-orm"
import type {
  DrizzleFactoryInputVisibilityBehaviors,
  SelectedTableColumns,
  ValueOrGetter,
  VisibilityBehavior,
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
    `${pascalCase(getTableName(column.table))}${pascalCase(column.name)}Enum`
  if ("config" in column && "enum" in (column as any).config) {
    const enumName = (column as any).config.enum.enumName
    if (enumName) return pascalCase(enumName)
  }

  return useColumnName()
}

export function isColumnVisible(
  columnName: string,
  options: DrizzleFactoryInputVisibilityBehaviors<Table>,
  behavior: keyof VisibilityBehavior
): boolean {
  // Get specific column configuration
  const columnConfig = options?.[columnName as keyof typeof options]
  // Get global default configuration
  const defaultConfig = options?.["*"]
  if (columnConfig != null) {
    if (typeof columnConfig === "boolean") {
      return columnConfig
    }
    const specificBehavior = columnConfig[behavior]
    if (specificBehavior != null) {
      return specificBehavior
    }
  }

  if (defaultConfig != null) {
    if (typeof defaultConfig === "boolean") {
      return defaultConfig
    }
    const defaultBehavior = defaultConfig[behavior]
    if (defaultBehavior != null) {
      return defaultBehavior
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
    selectedFields = resolvingFields.selectedFields
  }
  return mapValue(getTableColumns(table), (column, columnName) => {
    if (selectedFields.has(columnName)) return column
    return mapValue.SKIP
  }) as SelectedTableColumns<TTable>
}

/**
 * Get the queried columns from the resolver payload
 * @param table - The table to get the queried columns from
 * @param payload - The resolver payload
 * @returns The queried columns
 */
export function getQueriedColumns(
  table: Table,
  payload: ResolverPayload | (ResolverPayload | undefined)[] | undefined
): Partial<Record<string, true>> {
  return mapValue(getSelectedColumns(table, payload), () => true)
}
