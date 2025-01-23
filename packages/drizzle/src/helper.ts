import type { Column, SQL } from "drizzle-orm"
import { sql } from "drizzle-orm"

/**
 * Creates an IN clause for multiple columns
 * Example: (col1, col2) IN ((val1, val2), (val3, val4))
 */
export function inArrayMultiple(
  columns: Column[],
  values: readonly unknown[][]
): SQL<unknown> {
  // Early return for empty values
  if (values.length === 0) {
    return sql`FALSE`
  }
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
