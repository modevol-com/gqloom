import { mapValue, pascalCase, weaverContext } from "@gqloom/core"
import { type Table, getTableColumns, getTableName } from "drizzle-orm"
import { GraphQLNonNull, GraphQLObjectType, isNonNullType } from "graphql"
import { DrizzleWeaver } from "./index"

export class DrizzleInputWeaver<TTable extends Table> {
  constructor(public readonly table: TTable) {}

  public insertInput() {
    const name = `${pascalCase(getTableName(this.table))}InsertInput`

    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing

    const columns = getTableColumns(this.table)
    return weaverContext.memoNamedType(
      new GraphQLObjectType({
        name,
        fields: mapValue(columns, (column) => {
          const type = (() => {
            const t = DrizzleWeaver.getColumnType(column)
            if (column.hasDefault) return t
            if (column.notNull && !isNonNullType(t))
              return new GraphQLNonNull(t)
            return t
          })()

          return { type }
        }),
      })
    )
  }

  public updateInput() {
    return
  }

  public filters() {
    return
  }

  public orderBy() {
    return
  }
}
