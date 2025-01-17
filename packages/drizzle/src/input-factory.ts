import { mapValue, pascalCase, weaverContext } from "@gqloom/core"
import {
  type Column,
  type InferSelectModel,
  type Table,
  getTableColumns,
  getTableName,
} from "drizzle-orm"
import {
  GraphQLBoolean,
  GraphQLEnumType,
  type GraphQLFieldConfig,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
  isNonNullType,
} from "graphql"
import { DrizzleWeaver } from "./index"

export class DrizzleInputFactory<TTable extends Table> {
  constructor(public readonly table: TTable) {}

  public selectArrayArgs() {
    const name = `${pascalCase(getTableName(this.table))}SelectArrayArgs`
    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    return weaverContext.memoNamedType(
      new GraphQLObjectType<SelectArrayArgs<TTable>>({
        name,
        fields: {
          offset: { type: GraphQLInt },
          limit: { type: GraphQLInt },
          orderBy: { type: this.orderBy() },
          where: { type: this.filters() },
        },
      })
    )
  }

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

    const columns = getTableColumns(this.table)
    const filterFields: Record<
      string,
      GraphQLFieldConfig<any, any, any>
    > = mapValue(columns, (column) => ({
      type: DrizzleInputFactory.columnFilters(column),
    }))

    const filtersOr = new GraphQLObjectType({
      name: `${pascalCase(getTableName(this.table))}FiltersOr`,
      fields: { ...filterFields },
    })
    return weaverContext.memoNamedType(
      new GraphQLObjectType({
        name,
        fields: {
          ...filterFields,
          OR: { type: new GraphQLList(new GraphQLNonNull(filtersOr)) },
        },
      })
    )
  }

  protected static columnFilters(column: Column) {
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

  public orderBy() {
    const name = `${pascalCase(getTableName(this.table))}OrderBy`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing

    const columns = getTableColumns(this.table)
    return weaverContext.memoNamedType(
      new GraphQLObjectType({
        name,
        fields: mapValue(columns, () => {
          const type = DrizzleInputFactory.orderDirection()
          return { type }
        }),
      })
    )
  }

  protected static orderDirection() {
    const name = "OrderDirection"
    const existing = weaverContext.getNamedType(name) as GraphQLEnumType
    if (existing != null) return existing

    return weaverContext.memoNamedType(
      new GraphQLEnumType({
        name,
        values: {
          asc: { value: "asc" },
          desc: { value: "desc" },
        },
      })
    )
  }
}

export interface SelectArrayArgs<TTable extends Table> {
  offset?: number
  limit?: number
  orderBy?: Partial<Record<keyof InferSelectModel<TTable>, "asc" | "desc">>[]
  where?: Filters<TTable>
}

export type FiltersCore<TTable extends Table> = Partial<{
  [Column in keyof TTable["_"]["columns"]]: ColumnFilters<
    TTable["_"]["columns"][Column]["_"]["data"]
  >
}>

export type Filters<TTable extends Table> = FiltersCore<TTable> & {
  OR?: FiltersCore<TTable>[]
}

export interface ColumnFiltersCore<TType = any> {
  eq?: TType
  ne?: TType
  lt?: TType
  lte?: TType
  gt?: TType
  gte?: TType
  like?: TType extends string ? string : never
  notLike?: TType extends string ? string : never
  ilike?: TType extends string ? string : never
  notIlike?: TType extends string ? string : never
  inArray?: TType[]
  notInArray?: TType[]
  isNull?: boolean
  isNotNull?: boolean
}

export interface ColumnFilters<TType = any> extends ColumnFiltersCore<TType> {
  OR?: ColumnFiltersCore<TType>[]
}
