import { pascalCase } from "@gqloom/core"
import {
  type Column,
  type SQL,
  type Table,
  getTableName,
  sql,
} from "drizzle-orm"
import type { AnyQueryBuilder } from "./factory"
import type {
  DrizzleFactoryInputVisibilityBehaviors,
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

export function matchQueryBuilder(
  queries: Record<string, any>,
  targetTable: any
): AnyQueryBuilder | undefined {
  for (const qb of Object.values(queries)) {
    if (qb.table != null && qb.table === targetTable) {
      return qb
    }
  }
}
