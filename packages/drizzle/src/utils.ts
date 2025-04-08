import { pascalCase } from "@gqloom/core"
import { type Column, getTableName } from "drizzle-orm"

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
