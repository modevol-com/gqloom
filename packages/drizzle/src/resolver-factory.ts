import {
  type FieldOrOperation,
  type GraphQLFieldOptions,
  type GraphQLSilk,
  type Middleware,
  loom,
  silk,
} from "@gqloom/core"
import {
  type Column,
  type ExtractTablesWithRelations,
  type InferSelectModel,
  type SQL,
  type Table,
  type TableRelationalConfig,
  type TablesRelationalConfig,
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  getTableName,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  like,
  lt,
  lte,
  ne,
  notIlike,
  notInArray,
  notLike,
  or,
} from "drizzle-orm"
import type { MySqlDatabase } from "drizzle-orm/mysql-core"
import type { RelationalQueryBuilder as MySqlRelationalQueryBuilder } from "drizzle-orm/mysql-core/query-builders/query"
import type { PgDatabase } from "drizzle-orm/pg-core"
import type { RelationalQueryBuilder as PgRelationalQueryBuilder } from "drizzle-orm/pg-core/query-builders/query"
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core"
import type { RelationalQueryBuilder as SQLiteRelationalQueryBuilder } from "drizzle-orm/sqlite-core/query-builders/query"
import { GraphQLError } from "graphql"
import { DrizzleWeaver } from "."
import {
  type ColumnFilters,
  DrizzleInputFactory,
  type FiltersCore,
  type SelectArrayArgs,
  type SelectSingleArgs,
} from "./input-factory"

export class DrizzleResolverFactory<
  TDatabase extends BaseDatabase,
  TTable extends Table,
> {
  public readonly inputFactory: DrizzleInputFactory<TTable>
  public readonly tableName: string
  public readonly queryBase: QueryBase<TDatabase, TTable>
  constructor(
    public readonly db: TDatabase,
    public readonly table: TTable
  ) {
    this.inputFactory = new DrizzleInputFactory(table)
    this.tableName = getTableName(table)
    const queryBase = this.db.query[
      this.tableName as keyof typeof this.db.query
    ] as RelationalQueryBuilder<any, any>
    if (!queryBase) {
      throw new Error(
        `GQLoom-Drizzle Error: Table ${this.tableName} not found in drizzle instance. Did you forget to pass schema to drizzle constructor?`
      )
    }
    this.queryBase = queryBase
  }

  public selectArrayQuery<TInputI = SelectArrayArgs<TTable>>({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<InferSelectArrayOptions<TDatabase, TTable>, TInputI>
    middlewares?: Middleware<SelectArrayQuery<TDatabase, TTable, TInputI>>[]
  } = {}): SelectArrayQuery<TDatabase, TTable, TInputI> {
    const output = DrizzleWeaver.unravel(this.table)
    const queryBase = this.queryBase
    input ??= silk<
      InferSelectArrayOptions<TDatabase, TTable>,
      SelectArrayArgs<TTable>
    >(
      () => this.inputFactory.selectArrayArgs(),
      (args) => ({
        value: {
          where: this.extractFilters(args.where),
          orderBy: this.extractOrderBy(args.orderBy),
          limit: args.limit,
          offset: args.offset,
        },
      })
    ) as GraphQLSilk<InferSelectArrayOptions<TDatabase, TTable>, TInputI>

    return loom.query(output.$list(), {
      input,
      ...options,
      resolve: (opts) => {
        return queryBase.findMany(opts) as any
      },
    })
  }

  public selectSingleQuery<TInputI = SelectSingleArgs<TTable>>({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<InferSelectSingleOptions<TDatabase, TTable>, TInputI>
    middlewares?: Middleware<SelectSingleQuery<TDatabase, TTable, TInputI>>[]
  } = {}): SelectSingleQuery<TDatabase, TTable, TInputI> {
    const output = DrizzleWeaver.unravel(this.table)
    const queryBase = this.queryBase
    input ??= silk<
      InferSelectSingleOptions<TDatabase, TTable>,
      SelectSingleArgs<TTable>
    >(
      () => this.inputFactory.selectSingleArgs(),
      (args) => ({
        value: {
          where: this.extractFilters(args.where),
          orderBy: this.extractOrderBy(args.orderBy),
          offset: args.offset,
        },
      })
    ) as GraphQLSilk<InferSelectSingleOptions<TDatabase, TTable>, TInputI>

    return loom.query(output.$nullable(), {
      input,
      ...options,
      resolve: (opts) => {
        return queryBase.findFirst(opts) as any
      },
    })
  }

  public insertArrayMutation() {
    return
  }

  public insertSingleMutation() {
    return
  }

  public updateMutation() {
    return
  }

  public deleteMutation() {
    return
  }

  protected extractOrderBy(
    orders?: SelectArrayArgs<TTable>["orderBy"]
  ): SQL[] | undefined {
    if (orders == null) return
    const answer: SQL[] = []
    const columns = getTableColumns(this.table)
    for (const order of orders) {
      for (const [column, direction] of Object.entries(order)) {
        if (!direction) continue
        if (column in columns) {
          answer.push(
            direction === "asc" ? asc(columns[column]) : desc(columns[column])
          )
        }
      }
    }
    return answer
  }

  protected extractFilters(
    filters: SelectArrayArgs<TTable>["where"]
  ): SQL | undefined {
    if (filters == null) return
    const tableName = getTableName(this.table)

    if (!filters.OR?.length) delete filters.OR

    const entries = Object.entries(filters as FiltersCore<TTable>)

    if (filters.OR) {
      if (entries.length > 1) {
        throw new GraphQLError(
          `WHERE ${tableName}: Cannot specify both fields and 'OR' in table filters!`
        )
      }

      const variants = [] as SQL[]

      for (const variant of filters.OR) {
        const extracted = this.extractFilters(variant)
        if (extracted) variants.push(extracted)
      }

      return or(...variants)
    }

    const variants: SQL[] = []
    for (const [columnName, operators] of entries) {
      if (operators == null) continue

      const column = getTableColumns(this.table)[columnName]!
      variants.push(this.extractFiltersColumn(column, columnName, operators)!)
    }

    return and(...variants)
  }

  protected extractFiltersColumn<TColumn extends Column>(
    column: TColumn,
    columnName: string,
    operators: ColumnFilters<TColumn["_"]["data"]>
  ): SQL | undefined {
    if (!operators.OR?.length) delete operators.OR

    const entries = Object.entries(operators)

    if (operators.OR) {
      if (entries.length > 1) {
        throw new GraphQLError(
          `WHERE ${columnName}: Cannot specify both fields and 'OR' in column operators!`
        )
      }

      const variants = [] as SQL[]

      for (const variant of operators.OR) {
        const extracted = this.extractFiltersColumn(column, columnName, variant)

        if (extracted) variants.push(extracted)
      }

      return or(...variants)
    }

    const variants: SQL[] = []
    const binaryOperators = { eq, ne, gt, gte, lt, lte }
    const textOperators = { like, notLike, ilike, notIlike }
    const arrayOperators = { inArray, notInArray }
    const nullOperators = { isNull, isNotNull }

    for (const [operatorName, operatorValue] of entries) {
      if (operatorValue === null || operatorValue === false) continue

      if (operatorName in binaryOperators) {
        const operator =
          binaryOperators[operatorName as keyof typeof binaryOperators]
        variants.push(operator(column, operatorValue))
      } else if (operatorName in textOperators) {
        const operator =
          textOperators[operatorName as keyof typeof textOperators]
        variants.push(operator(column, operatorValue))
      } else if (operatorName in arrayOperators) {
        const operator =
          arrayOperators[operatorName as keyof typeof arrayOperators]
        variants.push(operator(column, operatorValue))
      } else if (operatorName in nullOperators) {
        const operator =
          nullOperators[operatorName as keyof typeof nullOperators]
        if (operatorValue === true) variants.push(operator(column))
      }
    }

    return and(...variants)
  }
}

export interface SelectArrayQuery<
  TDatabase extends BaseDatabase,
  TTable extends Table,
  TInputI = SelectArrayArgs<TTable>,
> extends FieldOrOperation<
    undefined,
    GraphQLSilk<InferSelectModel<TTable>[], InferSelectModel<TTable>[]>,
    GraphQLSilk<InferSelectArrayOptions<TDatabase, TTable>, TInputI>,
    "query"
  > {}

export type InferSelectArrayOptions<
  TDatabase extends BaseDatabase,
  TTable extends Table,
> = Parameters<QueryBase<TDatabase, TTable>["findMany"]>[0]

export interface SelectSingleQuery<
  TDatabase extends BaseDatabase,
  TTable extends Table,
  TInputI = SelectSingleArgs<TTable>,
> extends FieldOrOperation<
    undefined,
    GraphQLSilk<
      InferSelectModel<TTable> | null | undefined,
      InferSelectModel<TTable> | null | undefined
    >,
    GraphQLSilk<InferSelectSingleOptions<TDatabase, TTable>, TInputI>,
    "query"
  > {}

export type InferSelectSingleOptions<
  TDatabase extends BaseDatabase,
  TTable extends Table,
> = Parameters<QueryBase<TDatabase, TTable>["findFirst"]>[0]

type QueryBase<
  TDatabase extends BaseDatabase,
  TTable extends Table,
> = RelationalQueryBuilder<
  TDatabase["_"]["schema"],
  ExtractTableWithRelations<TTable>
>

type ExtractTableWithRelations<TTable extends Table> = ValueOf<
  ExtractTablesWithRelations<Record<string, TTable>>
>

type BaseDatabase =
  | BaseSQLiteDatabase<any, any, any, any>
  | PgDatabase<any, any, any>
  | MySqlDatabase<any, any, any, any>

type RelationalQueryBuilder<
  TSchema extends TablesRelationalConfig,
  TFields extends TableRelationalConfig,
> =
  | MySqlRelationalQueryBuilder<any, TSchema, TFields>
  | PgRelationalQueryBuilder<TSchema, TFields>
  | SQLiteRelationalQueryBuilder<any, any, TSchema, TFields>

type ValueOf<T> = T[keyof T]
