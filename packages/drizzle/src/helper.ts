import { pascalCase } from "@gqloom/core"
import {
  type Column,
  type SQL,
  type Table,
  getTableName,
  sql,
} from "drizzle-orm"
import type { DrizzleFactoryOptionsColumn, VisibilityBehavior } from "./types"

/**
 * Creates an IN clause for multiple columns
 * Example: (col1, col2) IN ((val1, val2), (val3, val4))
 */
export function inArrayMultiple(
  columns: Column[],
  values: readonly unknown[][]
): SQL<unknown> {
  // Early return for empty values
  if (values.length === 0) return sql`FALSE`

  // Create (col1, col2, ...) part
  const columnsPart = sql`(${sql.join(
    columns.map((c) => sql`${c}`),
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
  options: DrizzleFactoryOptionsColumn<Table>,
  behavior: keyof VisibilityBehavior
): boolean {
  // Get specific column configuration
  const columnConfig = options?.[columnName as keyof typeof options]
  if (columnConfig && typeof columnConfig === "object") {
    const specificBehavior = columnConfig[behavior]
    if (typeof specificBehavior === "boolean") {
      return specificBehavior
    }
  }

  // Get global default configuration
  const defaultConfig = options?.["*"]
  if (defaultConfig && typeof defaultConfig === "object") {
    const defaultBehavior = defaultConfig[behavior]
    if (typeof defaultBehavior === "boolean") {
      return defaultBehavior
    }
  }

  // Default to visible
  return true
}
