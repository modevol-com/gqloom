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

export function paramsAsKey(params: any): string {
  if (typeof params !== "object" || params === null) return String(params)

  const searchParams = new URLSearchParams()
  const visited = new WeakMap<object, string>()

  function addToParams(obj: unknown, prefix = "") {
    // Handle functions
    if (typeof obj === "function") {
      searchParams.set(prefix, "[Function]")
      return
    }

    if (Array.isArray(obj)) {
      // Check for circular reference
      if (visited.has(obj)) {
        searchParams.set(prefix, `[Circular](${visited.get(obj)})`)
        return
      }
      visited.set(obj, prefix)

      obj.forEach((value, index) => {
        const key = prefix ? `${prefix}.${index}` : String(index)
        if (
          value != null &&
          (typeof value === "object" || typeof value === "function")
        ) {
          addToParams(value, key)
        } else {
          searchParams.set(key, String(value))
        }
      })

      visited.delete(obj)
      return
    }

    if (typeof obj !== "object" || obj === null) {
      searchParams.set(prefix, String(obj))
      return
    }

    // Check for circular reference
    if (visited.has(obj)) {
      searchParams.set(prefix, `[Circular](${visited.get(obj)})`)
      return
    }
    visited.set(obj, prefix)

    for (const [key, value] of Object.entries(obj)) {
      const newPrefix = prefix ? `${prefix}.${key}` : key

      if (value == null) {
        searchParams.set(newPrefix, "")
      } else if (typeof value === "function") {
        searchParams.set(newPrefix, "[Function]")
      } else if (Array.isArray(value)) {
        addToParams(value, newPrefix)
      } else if (typeof value === "object") {
        addToParams(value, newPrefix)
      } else {
        searchParams.set(newPrefix, String(value))
      }
    }

    visited.delete(obj)
  }

  addToParams(params)
  searchParams.sort()
  return decodeURI(searchParams.toString())
}
