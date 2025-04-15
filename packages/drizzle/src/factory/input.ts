import { mapValue, pascalCase, weaverContext } from "@gqloom/core"
import {
  type Column,
  type InferInsertModel,
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
import { isColumnVisible } from "../helper"
import { DrizzleWeaver } from "../index"
import type { DrizzleFactoryOptionsColumn } from "../types"

export class DrizzleInputFactory<TTable extends Table> {
  public constructor(
    public readonly table: TTable,
    public readonly options?: DrizzleFactoryOptionsColumn<TTable>
  ) {}

  public selectArrayArgs() {
    const name = `${pascalCase(getTableName(this.table))}SelectArrayArgs`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing

    return weaverContext.memoNamedType(
      new GraphQLObjectType<SelectArrayArgs<TTable>>({
        name,
        fields: {
          offset: { type: GraphQLInt },
          limit: { type: GraphQLInt },
          orderBy: {
            type: new GraphQLList(new GraphQLNonNull(this.orderBy())),
          },
          where: { type: this.filters() },
        },
      })
    )
  }

  public selectSingleArgs() {
    const name = `${pascalCase(getTableName(this.table))}SelectSingleArgs`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing

    return weaverContext.memoNamedType(
      new GraphQLObjectType<SelectSingleArgs<TTable>>({
        name,
        fields: {
          offset: { type: GraphQLInt },
          orderBy: {
            type: new GraphQLList(new GraphQLNonNull(this.orderBy())),
          },
          where: { type: this.filters() },
        },
      })
    )
  }

  public insertArrayArgs() {
    const name = `${pascalCase(getTableName(this.table))}InsertArrayArgs`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing

    return weaverContext.memoNamedType(
      new GraphQLObjectType<InsertArrayArgs<TTable>>({
        name,
        fields: {
          values: {
            type: new GraphQLNonNull(
              new GraphQLList(new GraphQLNonNull(this.insertInput()))
            ),
          },
        },
      })
    )
  }

  public insertSingleArgs() {
    const name = `${pascalCase(getTableName(this.table))}InsertSingleArgs`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing

    return weaverContext.memoNamedType(
      new GraphQLObjectType<InsertSingleArgs<TTable>>({
        name,
        fields: {
          value: { type: new GraphQLNonNull(this.insertInput()) },
        },
      })
    )
  }

  public updateArgs() {
    const name = `${pascalCase(getTableName(this.table))}UpdateArgs`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing

    return weaverContext.memoNamedType(
      new GraphQLObjectType<UpdateArgs<TTable>>({
        name,
        fields: {
          where: { type: this.filters() },
          set: { type: new GraphQLNonNull(this.updateInput()) },
        },
      })
    )
  }

  public deleteArgs() {
    const name = `${pascalCase(getTableName(this.table))}DeleteArgs`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing

    return weaverContext.memoNamedType(
      new GraphQLObjectType<DeleteArgs<TTable>>({
        name,
        fields: {
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
          if (
            isColumnVisible(column.name, this.options ?? {}, "insert") === false
          ) {
            return mapValue.SKIP
          }
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
          if (
            isColumnVisible(column.name, this.options ?? {}, "update") === false
          ) {
            return mapValue.SKIP
          }
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
    > = mapValue(columns, (column) => {
      if (
        isColumnVisible(column.name, this.options ?? {}, "filters") === false
      ) {
        return mapValue.SKIP
      }
      return {
        type: DrizzleInputFactory.columnFilters(column),
      }
    })

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

  public static mutationResult() {
    const name = "MutationSuccessResult"
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing

    return weaverContext.memoNamedType(
      new GraphQLObjectType({
        name,
        fields: {
          isSuccess: { type: new GraphQLNonNull(GraphQLBoolean) },
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

export interface SelectSingleArgs<TTable extends Table> {
  offset?: number
  orderBy?: Partial<Record<keyof InferSelectModel<TTable>, "asc" | "desc">>[]
  where?: Filters<TTable>
}

export interface InsertArrayArgs<TTable extends Table> {
  values: InferInsertModel<TTable>[]
}

export interface InsertSingleArgs<TTable extends Table> {
  value: InferInsertModel<TTable>
}

export interface UpdateArgs<TTable extends Table> {
  where?: Filters<TTable>
  set: Partial<InferInsertModel<TTable>>
}

export interface DeleteArgs<TTable extends Table> {
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

export interface MutationResult {
  isSuccess: boolean
}
