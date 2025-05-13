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
import { getValue, isColumnVisible } from "../helper"
import { DrizzleWeaver } from "../index"
import type { DrizzleResolverFactoryOptions } from "../types"

export class DrizzleInputFactory<TTable extends Table> {
  public constructor(
    public readonly table: TTable,
    public readonly options?: DrizzleResolverFactoryOptions<TTable>
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
            type: this.orderBy(),
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
            type: this.orderBy(),
          },
          where: { type: this.filters() },
        },
      })
    )
  }

  public countArgs() {
    const name = `${pascalCase(getTableName(this.table))}CountArgs`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing

    return weaverContext.memoNamedType(
      new GraphQLObjectType<CountArgs<TTable>>({
        name,
        fields: {
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

  public insertArrayWithOnConflictArgs() {
    const name = `${pascalCase(getTableName(this.table))}InsertArrayArgs`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing

    return weaverContext.memoNamedType(
      new GraphQLObjectType<InsertArrayWithOnConflictArgs<TTable>>({
        name,
        fields: {
          values: {
            type: new GraphQLNonNull(
              new GraphQLList(new GraphQLNonNull(this.insertInput()))
            ),
          },
          onConflictDoUpdate: { type: this.insertOnConflictDoUpdateInput() },
          onConflictDoNothing: { type: this.insertOnConflictDoNothingInput() },
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

  public insertSingleWithOnConflictArgs() {
    const name = `${pascalCase(getTableName(this.table))}InsertSingleArgs`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing

    return weaverContext.memoNamedType(
      new GraphQLObjectType<InsertSingleWithOnConflictArgs<TTable>>({
        name,
        fields: {
          value: { type: new GraphQLNonNull(this.insertInput()) },
          onConflictDoUpdate: { type: this.insertOnConflictDoUpdateInput() },
          onConflictDoNothing: { type: this.insertOnConflictDoNothingInput() },
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

  public tableColumnEnum() {
    const tableConfig = DrizzleWeaver.silkConfigs.get(this.table)
    const tableName = tableConfig?.name ?? getTableName(this.table)

    const name = `${pascalCase(tableName)}TableColumn`
    const existing = weaverContext.getNamedType(name) as GraphQLEnumType
    if (existing != null) return existing

    const fieldsConfig = getValue(tableConfig?.fields) ?? {}
    return weaverContext.memoNamedType(
      new GraphQLEnumType({
        name,
        values: mapValue(getTableColumns(this.table), (_, columnName) => {
          const columnConfig = fieldsConfig[columnName]
          return { value: columnName, description: columnConfig?.description }
        }),
      })
    )
  }

  public insertInput() {
    const tableConfig = DrizzleWeaver.silkConfigs.get(this.table)
    const tableName = tableConfig?.name ?? getTableName(this.table)

    const name = `${pascalCase(tableName)}InsertInput`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing

    const columns = getTableColumns(this.table)
    const fieldsConfig = getValue(tableConfig?.fields) ?? {}
    return weaverContext.memoNamedType(
      new GraphQLObjectType({
        name,
        description: tableConfig?.description,
        fields: mapValue(columns, (column, columnName) => {
          if (
            !isColumnVisible(columnName, this.options?.input ?? {}, "insert")
          ) {
            return mapValue.SKIP
          }
          const type = (() => {
            const fieldConfig = fieldsConfig[columnName]
            const t = fieldConfig?.type ?? DrizzleWeaver.getColumnType(column)
            if (column.hasDefault) return t
            if (column.notNull && !isNonNullType(t))
              return new GraphQLNonNull(t)
            return t
          })()
          const columnConfig = fieldsConfig[columnName]
          return { type, description: columnConfig?.description }
        }),
      })
    )
  }

  public insertOnConflictDoUpdateInput() {
    const tableConfig = DrizzleWeaver.silkConfigs.get(this.table)
    const tableName = tableConfig?.name ?? getTableName(this.table)

    const name = `${pascalCase(tableName)}InsertOnConflictDoUpdateInput`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing

    return weaverContext.memoNamedType(
      new GraphQLObjectType({
        name,
        fields: {
          target: {
            type: new GraphQLNonNull(
              new GraphQLList(new GraphQLNonNull(this.tableColumnEnum()))
            ),
          },
          set: { type: this.updateInput() },
          targetWhere: { type: this.filters() },
          setWhere: { type: this.filters() },
        },
      })
    )
  }

  public insertOnConflictDoNothingInput() {
    const tableConfig = DrizzleWeaver.silkConfigs.get(this.table)
    const tableName = tableConfig?.name ?? getTableName(this.table)

    const name = `${pascalCase(tableName)}InsertOnConflictDoNothingInput`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing

    return weaverContext.memoNamedType(
      new GraphQLObjectType({
        name,
        fields: {
          target: {
            type: new GraphQLList(new GraphQLNonNull(this.tableColumnEnum())),
          },
          where: { type: this.filters() },
        },
      })
    )
  }

  public updateInput() {
    const tableConfig = DrizzleWeaver.silkConfigs.get(this.table)
    const tableName = tableConfig?.name ?? getTableName(this.table)

    const name = `${pascalCase(tableName)}UpdateInput`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing

    const columns = getTableColumns(this.table)
    const fieldsConfig = getValue(tableConfig?.fields) ?? {}
    return weaverContext.memoNamedType(
      new GraphQLObjectType({
        name,
        description: tableConfig?.description,
        fields: mapValue(columns, (column, columnName) => {
          if (
            !isColumnVisible(columnName, this.options?.input ?? {}, "update")
          ) {
            return mapValue.SKIP
          }
          const type =
            fieldsConfig[columnName]?.type ??
            DrizzleWeaver.getColumnType(column)
          const columnConfig = fieldsConfig[columnName]
          return { type, description: columnConfig?.description }
        }),
      })
    )
  }

  public filters() {
    const tableConfig = DrizzleWeaver.silkConfigs.get(this.table)
    const tableName = tableConfig?.name ?? getTableName(this.table)

    const name = `${pascalCase(tableName)}Filters`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing

    const columns = getTableColumns(this.table)
    const fieldsConfig = getValue(tableConfig?.fields) ?? {}
    const filterFields: Record<
      string,
      GraphQLFieldConfig<any, any, any>
    > = mapValue(columns, (column, columnName) => {
      if (
        isColumnVisible(columnName, this.options?.input ?? {}, "filters") ===
        false
      ) {
        return mapValue.SKIP
      }
      const columnConfig = fieldsConfig[columnName]
      return {
        type: DrizzleInputFactory.columnFilters(column),
        description: columnConfig?.description,
      }
    })

    const filtersNested = new GraphQLObjectType({
      name: `${pascalCase(tableName)}FiltersNested`,
      fields: { ...filterFields },
    })
    return weaverContext.memoNamedType(
      new GraphQLObjectType({
        name,
        description: tableConfig?.description,
        fields: {
          ...filterFields,
          OR: { type: new GraphQLList(new GraphQLNonNull(filtersNested)) },
          AND: { type: new GraphQLList(new GraphQLNonNull(filtersNested)) },
          NOT: { type: filtersNested },
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
      in: { type: gqlListType },
      notIn: { type: gqlListType },
      isNull: { type: GraphQLBoolean },
      isNotNull: { type: GraphQLBoolean },
    }

    const filtersNested = new GraphQLObjectType({
      name: `${pascalCase(column.columnType)}FiltersNested`,
      fields: { ...baseFields },
    })

    return weaverContext.memoNamedType(
      new GraphQLObjectType({
        name,
        fields: {
          ...baseFields,
          OR: { type: new GraphQLList(new GraphQLNonNull(filtersNested)) },
          AND: { type: new GraphQLList(new GraphQLNonNull(filtersNested)) },
          NOT: { type: filtersNested },
        },
      })
    )
  }

  public orderBy() {
    const tableConfig = DrizzleWeaver.silkConfigs.get(this.table)
    const tableName = tableConfig?.name ?? getTableName(this.table)

    const name = `${pascalCase(tableName)}OrderBy`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing

    const columns = getTableColumns(this.table)
    const fieldsConfig = getValue(tableConfig?.fields) ?? {}
    return weaverContext.memoNamedType(
      new GraphQLObjectType({
        name,
        fields: mapValue(columns, (_, columnName) => {
          const type = DrizzleInputFactory.orderDirection()
          const columnConfig = fieldsConfig[columnName]
          return { type, description: columnConfig?.description }
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
  orderBy?: Partial<Record<keyof InferSelectModel<TTable>, "asc" | "desc">>
  where?: Filters<TTable>
}

export interface SelectSingleArgs<TTable extends Table> {
  offset?: number
  orderBy?: Partial<Record<keyof InferSelectModel<TTable>, "asc" | "desc">>
  where?: Filters<TTable>
}

export interface CountArgs<TTable extends Table> {
  where?: Filters<TTable>
}

export interface InsertArrayArgs<TTable extends Table> {
  values: InferInsertModel<TTable>[]
}

export interface InsertArrayWithOnConflictArgs<TTable extends Table>
  extends InsertArrayArgs<TTable> {
  onConflictDoUpdate?: {
    target: string[]
    set?: Partial<InferInsertModel<TTable>>
    targetWhere?: Filters<TTable>
    setWhere?: Filters<TTable>
  }
  onConflictDoNothing?: {
    target?: string[]
    where?: Filters<TTable>
  }
}

export interface InsertSingleArgs<TTable extends Table> {
  value: InferInsertModel<TTable>
}

export interface InsertSingleWithOnConflictArgs<TTable extends Table>
  extends InsertSingleArgs<TTable> {
  onConflictDoUpdate?: {
    target: string[]
    set?: Partial<InferInsertModel<TTable>>
    targetWhere?: Filters<TTable>
    setWhere?: Filters<TTable>
  }
  onConflictDoNothing?: {
    target?: string[]
    where?: Filters<TTable>
  }
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
  AND?: FiltersCore<TTable>[]
  NOT?: FiltersCore<TTable>
}

export interface ColumnFiltersCore<TType = any> {
  eq?: TType
  ne?: TType
  gt?: TType
  gte?: TType
  lt?: TType
  lte?: TType
  in?: TType[]
  notIn?: TType[]
  like?: TType extends string ? string : never
  ilike?: TType extends string ? string : never
  notLike?: TType extends string ? string : never
  notIlike?: TType extends string ? string : never
  isNull?: boolean
  isNotNull?: boolean
}

export interface ColumnFilters<TType = any> extends ColumnFiltersCore<TType> {
  OR?: ColumnFiltersCore<TType>[]
  AND?: ColumnFiltersCore<TType>[]
  NOT?: ColumnFiltersCore<TType>
}

export interface MutationResult {
  isSuccess: boolean
}
