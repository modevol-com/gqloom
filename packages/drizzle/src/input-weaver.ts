import { mapValue, pascalCase, weaverContext } from "@gqloom/core"
import {
  type Column,
  type Table,
  getTableColumns,
  getTableName,
} from "drizzle-orm"
import {
  GraphQLBoolean,
  type GraphQLFieldConfig,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
  isNonNullType,
} from "graphql"
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
    const name = `${pascalCase(getTableName(this.table))}UpdateInput`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing

    const columns = getTableColumns(this.table)
    return weaverContext.memoNamedType(
      new GraphQLObjectType({
        name,
        fields: mapValue(columns, (column) => {
          const type = DrizzleWeaver.getColumnType(column)
          return { type }
        }),
      })
    )
  }

  public filters() {
    const name = `${pascalCase(getTableName(this.table))}Filters`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing

    // TODO
    return
  }

  public orderBy() {
    return
  }

  protected columnFilters(column: Column) {
    const name = `${pascalCase(column.columnType)}Filters`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing

    const gqlType = DrizzleWeaver.getColumnType(column)
    const gqlListType = new GraphQLList(new GraphQLNonNull(gqlType))
    const baseFields: Record<string, GraphQLFieldConfig<any, any, any>> = {
      eq: { type: gqlType },
      ne: { type: gqlType },
      lt: { type: gqlType },
      lte: { type: gqlType },
      gt: { type: gqlType },
      gte: { type: gqlType },
      ...(gqlType === GraphQLString && {
        like: { type: GraphQLString },
        notLike: { type: GraphQLString },
        ilike: { type: GraphQLString },
        notIlike: { type: GraphQLString },
      }),
      inArray: { type: gqlListType },
      notInArray: { type: gqlListType },
      isNull: { type: GraphQLBoolean },
      isNotNull: { type: GraphQLBoolean },
    }

    const filtersOr = new GraphQLObjectType({
      name: `${pascalCase(column.columnType)}FiltersOr`,
      fields: { ...baseFields },
    })

    return weaverContext.memoNamedType(
      new GraphQLObjectType({
        name,
        fields: {
          ...baseFields,
          OR: { type: new GraphQLList(new GraphQLNonNull(filtersOr)) },
        },
      })
    )
  }
}
