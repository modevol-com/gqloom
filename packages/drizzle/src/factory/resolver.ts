import {
  FieldFactoryWithResolve,
  type FieldOptions,
  type GraphQLFieldOptions,
  type GraphQLSilk,
  type Loom,
  type Middleware,
  type ObjectChainResolver,
  QueryFactoryWithResolve,
  type QueryOptions,
  capitalize,
  getMemoizationMap,
  loom,
  mapValue,
  silk,
} from "@gqloom/core"
import {
  type Column,
  type InferSelectModel,
  Many,
  type Relation,
  type SQL,
  Table,
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
  not,
  notIlike,
  notInArray,
  notLike,
  or,
} from "drizzle-orm"
import { GraphQLInt, GraphQLNonNull } from "graphql"
import {
  type DrizzleResolverFactoryOptions,
  DrizzleWeaver,
  type SelectiveTable,
  type TableSilk,
} from ".."
import { getSelectedColumns } from "../helper"
import {
  type ColumnFilters,
  type CountArgs,
  type DeleteArgs,
  DrizzleInputFactory,
  type Filters,
  type FiltersCore,
  type InsertArrayArgs,
  type InsertSingleArgs,
  type RelationArgs,
  type RelationToManyArgs,
  type RelationToOneArgs,
  type SelectArrayArgs,
  type SelectSingleArgs,
  type UpdateArgs,
} from "./input"
import { RelationFieldLoader } from "./relation-field-loader"
import type {
  BaseDatabase,
  CountOptions,
  CountQuery,
  DeleteMutation,
  DrizzleQueriesResolver,
  InferTableName,
  InferTableRelationalConfig,
  InsertArrayMutation,
  InsertSingleMutation,
  QueryBuilder,
  QueryFieldOptions,
  QueryToManyFieldOptions,
  QueryToOneFieldOptions,
  RelationField,
  SelectArrayOptions,
  SelectArrayQuery,
  SelectSingleOptions,
  SelectSingleQuery,
  UpdateMutation,
} from "./types"

export abstract class DrizzleResolverFactory<
  TDatabase extends BaseDatabase,
  TTable extends Table,
> {
  protected readonly inputFactory: DrizzleInputFactory<typeof this.table>
  protected readonly tableName: InferTableName<TTable>
  public constructor(
    protected readonly db: TDatabase,
    protected readonly table: TTable,
    protected readonly options?: DrizzleResolverFactoryOptions<TTable>
  ) {
    this.inputFactory = new DrizzleInputFactory(table, options)
    this.tableName = getTableName(table)
  }

  private _output?: TableSilk<TTable>
  protected get output() {
    this._output ??= DrizzleWeaver.unravel(this.table)
    return this._output as TableSilk<TTable>
  }

  public selectArrayQuery<TInputI = SelectArrayArgs<TTable>>({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<SelectArrayOptions | undefined, TInputI>
    middlewares?: Middleware<SelectArrayQuery<TTable, TInputI>>[]
  } = {}): SelectArrayQuery<TTable, TInputI> {
    input ??= silk<SelectArrayOptions | undefined, SelectArrayArgs<TTable>>(
      () => this.inputFactory.selectArrayArgs(),
      (args) => ({
        value: {
          where: this.extractFilters(args.where, this.table),
          orderBy: this.extractOrderBy(args.orderBy),
          limit: args.limit,
          offset: args.offset,
        },
      })
    ) as GraphQLSilk<SelectArrayOptions, TInputI>

    return new QueryFactoryWithResolve(this.output.$list(), {
      input,
      ...options,
      resolve: (opts: SelectArrayOptions | undefined, payload) => {
        let query: any = (this.db as any)
          .select(getSelectedColumns(this.table, payload))
          .from(this.table)
        if (opts?.where) query = query.where(opts.where)
        if (opts?.orderBy?.length) query = query.orderBy(...opts.orderBy)
        if (opts?.limit) query = query.limit(opts.limit)
        if (opts?.offset) query = query.offset(opts.offset)
        return query
      },
    } as QueryOptions<any, any>)
  }

  public selectSingleQuery<TInputI = SelectSingleArgs<TTable>>({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<SelectSingleOptions | undefined, TInputI>
    middlewares?: Middleware<SelectSingleQuery<TTable, TInputI>>[]
  } = {}): SelectSingleQuery<TTable, TInputI> {
    input ??= silk<SelectSingleOptions | undefined, SelectSingleArgs<TTable>>(
      () => this.inputFactory.selectSingleArgs(),
      (args) => ({
        value: {
          where: this.extractFilters(args.where, this.table),
          orderBy: this.extractOrderBy(args.orderBy),
          offset: args.offset,
        },
      })
    ) as GraphQLSilk<SelectSingleOptions, TInputI>

    return new QueryFactoryWithResolve(this.output.$nullable(), {
      input,
      ...options,
      resolve: (opts: SelectSingleOptions | undefined, payload) => {
        let query: any = (this.db as any)
          .select(getSelectedColumns(this.table, payload))
          .from(this.table)
        if (opts?.where) query = query.where(opts.where)
        if (opts?.orderBy?.length) query = query.orderBy(...opts.orderBy)
        query = query.limit(1)
        if (opts?.offset) query = query.offset(opts.offset)
        return query.then((res: any) => res[0])
      },
    } as QueryOptions<any, any>)
  }

  public countQuery<TInputI = CountArgs<TTable>>({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<CountOptions, TInputI>
    middlewares?: Middleware<CountQuery<TTable, TInputI>>[]
  } = {}): CountQuery<TTable, TInputI> {
    input ??= silk<CountOptions, CountArgs<TTable>>(
      () => this.inputFactory.countArgs(),
      (args) => ({
        value: { where: this.extractFilters(args.where, this.table) },
      })
    ) as GraphQLSilk<CountOptions, TInputI>

    return new QueryFactoryWithResolve(silk(new GraphQLNonNull(GraphQLInt)), {
      input,
      ...options,
      resolve: (args: CountOptions) => {
        return this.db.$count(this.table, args.where)
      },
    } as QueryOptions<any, any>)
  }

  protected extractOrderBy(
    orders?: SelectArrayArgs<TTable>["orderBy"]
  ): SQL[] | undefined {
    if (orders == null) return
    const answer: SQL[] = []
    const columns = getTableColumns(this.table)
    for (const [column, direction] of Object.entries(orders)) {
      if (!direction) continue
      if (column in columns) {
        answer.push(
          direction === "asc" ? asc(columns[column]) : desc(columns[column])
        )
      }
    }
    return answer
  }

  protected extractFilters(
    filters: Filters<any> | undefined,
    table?: any
  ): SQL | undefined {
    if (filters == null) return
    table ??= this.table

    const entries = Object.entries(filters as FiltersCore<TTable>)
    const variants: (SQL | undefined)[] = []

    for (const [columnName, operators] of entries) {
      if (operators == null) continue

      if (columnName === "OR" && Array.isArray(operators)) {
        const orConditions: SQL[] = []
        for (const variant of operators) {
          const extracted = this.extractFilters(variant, table)
          if (extracted) orConditions.push(extracted)
        }
        if (orConditions.length > 0) {
          variants.push(or(...orConditions))
        }
        continue
      }

      if (columnName === "AND" && Array.isArray(operators)) {
        const andConditions: SQL[] = []
        for (const variant of operators) {
          const extracted = this.extractFilters(variant, table)
          if (extracted) andConditions.push(extracted)
        }
        if (andConditions.length > 0) {
          variants.push(and(...andConditions))
        }
        continue
      }

      if (columnName === "NOT" && operators) {
        const extracted = this.extractFilters(operators, table)
        if (extracted) {
          variants.push(not(extracted))
        }
        continue
      }

      const column = getTableColumns(table)[columnName]!
      const extractedColumn = this.extractFiltersColumn(
        column,
        columnName,
        operators,
        table
      )
      if (extractedColumn) variants.push(extractedColumn)
    }

    return and(...variants)
  }

  protected extractFiltersColumn<TColumn extends Column>(
    column: TColumn,
    columnName: string,
    operators: ColumnFilters<TColumn["_"]["data"]>,
    table?: any
  ): SQL | undefined {
    const entries = Object.entries(operators)

    const variants: (SQL | undefined)[] = []
    const binaryOperators = { eq, ne, gt, gte, lt, lte }
    const textOperators = { like, notLike, ilike, notIlike }
    const arrayOperators = { in: inArray, notIn: notInArray }
    const nullOperators = { isNull, isNotNull }

    const tableColumn = table ? table[columnName] : column

    if (operators.OR) {
      const orVariants = [] as SQL[]

      for (const variant of operators.OR) {
        const extracted = this.extractFiltersColumn(
          column,
          columnName,
          variant,
          table
        )

        if (extracted) orVariants.push(extracted)
      }

      variants.push(or(...orVariants))
    }

    if (operators.AND) {
      const andVariants = [] as SQL[]

      for (const variant of operators.AND) {
        const extracted = this.extractFiltersColumn(
          column,
          columnName,
          variant,
          table
        )

        if (extracted) andVariants.push(extracted)
      }

      variants.push(and(...andVariants))
    }

    if (operators.NOT) {
      const extracted = this.extractFiltersColumn(
        column,
        columnName,
        operators.NOT,
        table
      )
      if (extracted) {
        variants.push(not(extracted))
      }
    }

    for (const [operatorName, operatorValue] of entries) {
      if (operatorValue === null || operatorValue === false) continue

      if (operatorName in binaryOperators) {
        const operator =
          binaryOperators[operatorName as keyof typeof binaryOperators]
        variants.push(operator(tableColumn, operatorValue))
      } else if (operatorName in textOperators) {
        const operator =
          textOperators[operatorName as keyof typeof textOperators]
        variants.push(operator(tableColumn, operatorValue))
      } else if (operatorName in arrayOperators) {
        const operator =
          arrayOperators[operatorName as keyof typeof arrayOperators]
        variants.push(operator(tableColumn, operatorValue))
      } else if (operatorName in nullOperators) {
        const operator =
          nullOperators[operatorName as keyof typeof nullOperators]
        if (operatorValue === true) variants.push(operator(tableColumn))
      }
    }

    return and(...variants)
  }

  protected toColumn(columnName: string) {
    const column = getTableColumns(this.table)[columnName]
    if (!column) {
      throw new Error(
        `Column ${columnName} not found in table ${this.tableName}`
      )
    }
    return column
  }

  public relationField<
    TRelationName extends keyof InferTableRelationalConfig<
      QueryBuilder<TDatabase, TTable>
    >["relations"],
    TInputI = RelationArgs<TDatabase, TTable, TRelationName>,
  >(
    relationName: TRelationName,
    {
      input,
      ...options
    }: GraphQLFieldOptions & {
      input?: GraphQLSilk<
        QueryFieldOptions<TDatabase, TTable, TRelationName>,
        TInputI
      >
      middlewares?: Middleware<
        RelationField<TDatabase, TTable, TRelationName>
      >[]
    } = {}
  ): RelationField<TDatabase, TTable, TRelationName> {
    const [relation, targetTable] = (() => {
      const tableKey = matchTableByTablesConfig(
        this.db._.relations.tablesConfig,
        this.table
      )?.tsName
      if (!tableKey) return [undefined, undefined]
      const relation = this.db._.relations["config"]?.[tableKey]?.[
        relationName
      ] as Relation
      const targetTable = relation?.targetTable
      return [relation, targetTable]
    })()
    if (!relation || !(targetTable instanceof Table)) {
      throw new Error(
        `GQLoom-Drizzle Error: Relation ${this.tableName}.${String(
          relationName
        )} not found in drizzle instance. Did you forget to pass relations to drizzle constructor?`
      )
    }
    const output = DrizzleWeaver.unravel(targetTable)
    const toMany = relation instanceof Many
    const targetInputFactory = new DrizzleInputFactory(targetTable)

    input ??= (
      toMany
        ? silk<QueryToManyFieldOptions<any>, RelationToManyArgs<TTable>>(
            () => targetInputFactory.relationToManyArgs(),
            (args) => ({
              value: {
                where: (t) => this.extractFilters(args.where, t),
                orderBy: args.orderBy,
                limit: args.limit,
                offset: args.offset,
              },
            })
          )
        : silk<QueryToOneFieldOptions<any>, RelationToOneArgs<TTable>>(
            () => targetInputFactory.relationToOneArgs(),
            (args) => ({
              value: {
                where: (t) => this.extractFilters(args.where, t),
              },
            })
          )
    ) as GraphQLSilk<
      QueryFieldOptions<TDatabase, TTable, TRelationName>,
      TInputI
    >

    const columns = Object.entries(getTableColumns(targetTable))
    const dependencies = relation.sourceColumns.map(
      (col) => columns.find(([_, value]) => value === col)?.[0] ?? col.name
    )
    const initLoader = () =>
      new RelationFieldLoader(
        this.db,
        relationName,
        relation,
        this.table,
        targetTable
      )

    return new FieldFactoryWithResolve(
      toMany ? output.$list() : output.$nullable(),
      {
        input,
        ...options,
        dependencies,
        resolve: (parent, input, payload) => {
          const loader = (() => {
            if (!payload) return initLoader()
            const memoMap = getMemoizationMap(payload)
            if (!memoMap.has(initLoader)) memoMap.set(initLoader, initLoader())
            return memoMap.get(initLoader) as ReturnType<typeof initLoader>
          })()
          return loader.load([parent, input, payload])
        },
      } as FieldOptions<any, any, any, any>
    )
  }

  public resolver<TTableName extends string = TTable["_"]["name"]>(options?: {
    name?: TTableName
    middlewares?: Middleware[]
  }): ObjectChainResolver<
    GraphQLSilk<InferSelectModel<TTable>, InferSelectModel<TTable>>,
    any
  > {
    const name = options?.name ?? this.tableName

    const fields: Record<string, Loom.Field<any, any, any, any>> = mapValue(
      this.db._.relations.config[this.tableName] ?? {},
      (_, key) => this.relationField(key)
    )

    return loom.resolver.of(
      this.output,
      {
        ...fields,
        [name]: this.selectArrayQuery(),
        [`${name}Single`]: this.selectSingleQuery(),
        [`${name}Count`]: this.countQuery(),
        [`insertInto${capitalize(name)}`]: this.insertArrayMutation(),
        [`insertInto${capitalize(name)}Single`]: this.insertSingleMutation(),
        [`update${capitalize(name)}`]: this.updateMutation(),
        [`deleteFrom${capitalize(name)}`]: this.deleteMutation(),
      },
      options
    ) as any
  }

  public queriesResolver<
    TTableName extends string = TTable["_"]["name"],
  >(options?: {
    name?: TTableName
    middlewares?: Middleware[]
  }): ObjectChainResolver<
    GraphQLSilk<SelectiveTable<TTable>, SelectiveTable<TTable>>,
    DrizzleQueriesResolver<TTable, TTableName>
  > {
    const name = options?.name ?? this.tableName

    const fields: Record<string, Loom.Field<any, any, any, any>> = mapValue(
      this.db._.schema?.[this.tableName]?.relations ?? {},
      (_, key) => this.relationField(key)
    )

    return loom.resolver.of(
      this.output,
      {
        ...fields,
        [name]: this.selectArrayQuery(),
        [`${name}Single`]: this.selectSingleQuery(),
        [`${name}Count`]: this.countQuery(),
      },
      options
    ) as any
  }

  public abstract insertArrayMutation<TInputI = InsertArrayArgs<TTable>>(
    options?: GraphQLFieldOptions & {
      input?: GraphQLSilk<InsertArrayArgs<TTable>, TInputI>
      middlewares?: Middleware[]
    }
  ): InsertArrayMutation<TTable, TInputI>

  public abstract insertSingleMutation<TInputI = InsertSingleArgs<TTable>>(
    options?: GraphQLFieldOptions & {
      input?: GraphQLSilk<InsertSingleArgs<TTable>, TInputI>
      middlewares?: Middleware[]
    }
  ): InsertSingleMutation<TTable, TInputI>

  public abstract updateMutation<TInputI = UpdateArgs<TTable>>(
    options?: GraphQLFieldOptions & {
      input?: GraphQLSilk<UpdateArgs<TTable>, TInputI>
      middlewares?: Middleware[]
    }
  ): UpdateMutation<TTable, TInputI>

  public abstract deleteMutation<TInputI = DeleteArgs<TTable>>(
    options?: GraphQLFieldOptions & {
      input?: GraphQLSilk<DeleteArgs<TTable>, TInputI>
      middlewares?: Middleware[]
    }
  ): DeleteMutation<TTable, TInputI>
}

function matchTableByTablesConfig(
  tablesConfig: TablesRelationalConfig,
  targetTable: Table
): TableRelationalConfig | undefined {
  for (const config of Object.values(tablesConfig)) {
    if (config.table === targetTable) {
      return config
    }
  }
}
