import { useResolverPayload } from "@gqloom/core/context"
import type { Table } from "drizzle-orm"
import { type SelectedTableColumns, getSelectedColumns } from "./helper"

/**
 * use the selected columns from the resolver payload
 * @param table - The table to get the selected columns from
 * @returns The selected columns
 */
export function useSelectedColumns<TTable extends Table>(table: TTable) {
  const payload = useResolverPayload()
  if (!payload) return {} as SelectedTableColumns<TTable>
  return getSelectedColumns(table, payload)
}
