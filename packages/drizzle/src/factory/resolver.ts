import {
  EasyDataLoader,
  FieldFactoryWithResolve,
  type FieldOptions,
  type GraphQLFieldOptions,
  type GraphQLSilk,
  type Loom,
  type Middleware,
  type ObjectChainResolver,
  QueryFactoryWithResolve,
  type QueryOptions,
  type ResolverPayload,
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
  type TableSilk,
} from ".."
import type { AnyQueryBuilder } from "../../dist/index.d.cts"
import { getSelectedColumns, inArrayMultiple } from "../helper"
import {
  type ColumnFilters,
  type CountArgs,
  type DeleteArgs,
  DrizzleInputFactory,
  type FiltersCore,
  type InsertArrayArgs,
  type InsertSingleArgs,
  type SelectArrayArgs,
  type SelectSingleArgs,
  type UpdateArgs,
} from "./input"
import type {
  BaseDatabase,
  CountQuery,
  DeleteMutation,
  InferRelationTable,
  InferSelectArrayOptions,
  InferSelectSingleOptions,
  InferTableName,
  InferTableRelationalConfig,
  InsertArrayMutation,
  InsertSingleMutation,
  QueryBuilder,
  RelationManyField,
  RelationOneField,
  SelectArrayQuery,
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
    input?: GraphQLSilk<InferSelectArrayOptions<TDatabase, TTable>, TInputI>
    middlewares?: Middleware<SelectArrayQuery<TDatabase, TTable, TInputI>>[]
  } = {}): SelectArrayQuery<TDatabase, TTable, TInputI> {
    input ??= silk<
      InferSelectArrayOptions<TDatabase, TTable>,
      SelectArrayArgs<TTable>
    >(
      () => this.inputFactory.selectArrayArgs(),
      (args) => ({
        value: {
          where: this.extractFilters(args.where, this.table),
          orderBy: this.extractOrderBy(args.orderBy),
          limit: args.limit,
          offset: args.offset,
        },
      })
    ) as GraphQLSilk<InferSelectArrayOptions<TDatabase, TTable>, TInputI>

    return new QueryFactoryWithResolve(this.output.$list(), {
      input,
      ...options,
      resolve: (
        opts: InferSelectArrayOptions<TDatabase, TTable> | undefined,
        payload
      ) => {
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
    input?: GraphQLSilk<InferSelectSingleOptions<TDatabase, TTable>, TInputI>
    middlewares?: Middleware<SelectSingleQuery<TDatabase, TTable, TInputI>>[]
  } = {}): SelectSingleQuery<TDatabase, TTable, TInputI> {
    input ??= silk<
      InferSelectSingleOptions<TDatabase, TTable>,
      SelectSingleArgs<TTable>
    >(
      () => this.inputFactory.selectSingleArgs(),
      (args) => ({
        value: {
          where: this.extractFilters(args.where, this.table),
          orderBy: this.extractOrderBy(args.orderBy),
          offset: args.offset,
        },
      })
    ) as GraphQLSilk<InferSelectSingleOptions<TDatabase, TTable>, TInputI>

    return new QueryFactoryWithResolve(this.output.$nullable(), {
      input,
      ...options,
      resolve: (
        opts: InferSelectSingleOptions<TDatabase, TTable> | undefined,
        payload
      ) => {
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
    input?: GraphQLSilk<CountArgs<TTable>, TInputI>
    middlewares?: Middleware<CountQuery<TTable, TInputI>>[]
  } = {}): CountQuery<TTable, TInputI> {
    input ??= silk<CountArgs<TTable>, CountArgs<TTable>>(() =>
      this.inputFactory.countArgs()
    ) as GraphQLSilk<CountArgs<TTable>, TInputI>

    return new QueryFactoryWithResolve(silk(new GraphQLNonNull(GraphQLInt)), {
      input,
      ...options,
      resolve: (args) => {
        return this.db.$count(this.table, this.extractFilters(args.where))
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
    filters: SelectArrayArgs<TTable>["where"],
    table?: any
  ): SQL | undefined {
    if (filters == null) return

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

      const column = getTableColumns(this.table)[columnName]!
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
  >(
    relationName: TRelationName,
    options?: GraphQLFieldOptions & {
      middlewares?: Middleware<
        InferTableRelationalConfig<
          QueryBuilder<TDatabase, TTable>
        >["relations"][TRelationName] extends Many<any, any>
          ? RelationManyField<
              TTable,
              InferRelationTable<TDatabase, TTable, TRelationName>
            >
          : RelationOneField<
              TTable,
              InferRelationTable<TDatabase, TTable, TRelationName>
            >
      >[]
    }
  ): InferTableRelationalConfig<
    QueryBuilder<TDatabase, TTable>
  >["relations"][TRelationName] extends Many<any, any>
    ? RelationManyField<
        TTable,
        InferRelationTable<TDatabase, TTable, TRelationName>
      >
    : RelationOneField<
        TTable,
        InferRelationTable<TDatabase, TTable, TRelationName>
      > {
    const [relation, queryBuilder, targetTable] = (() => {
      const tableKey = matchTableByTablesConfig(
        this.db._.relations.tablesConfig,
        this.table
      )?.tsName
      if (!tableKey) return [undefined, undefined, undefined]
      const relation = this.db._.relations["config"]?.[tableKey]?.[
        relationName
      ] as Relation
      const targetTable = relation?.targetTable
      return [
        relation,
        matchQueryBuilder(this.db.query, targetTable),
        targetTable,
      ]
    })()
    if (!queryBuilder || !relation || !(targetTable instanceof Table)) {
      throw new Error(
        `GQLoom-Drizzle Error: Relation ${this.tableName}.${String(
          relationName
        )} not found in drizzle instance. Did you forget to pass relations to drizzle constructor?`
      )
    }
    const output = DrizzleWeaver.unravel(targetTable)

    const isList = relation instanceof Many
    const fieldsLength = relation.sourceColumns.length

    const getKeyByField = (parent: any) => {
      if (fieldsLength === 1) {
        return parent[relation.sourceColumns[0].name]
      }
      return relation.sourceColumns.map((field) => parent[field.name]).join("-")
    }

    const referenceColumns = Object.fromEntries(
      relation.targetColumns.map((col) => [col.name, col])
    )

    const getKeyByReference = (item: any) => {
      if (fieldsLength === 1) {
        return item[relation.targetColumns[0].name]
      }
      return relation.targetColumns
        .map((reference) => item[reference.name])
        .join("-")
    }

    const initLoader = () => {
      return new EasyDataLoader(
        async (inputs: [any, payload: ResolverPayload | undefined][]) => {
          const where = (() => {
            if (fieldsLength === 1) {
              const values = inputs.map(
                ([parent]) => parent[relation.sourceColumns[0].name]
              )
              return inArray(relation.targetColumns[0], values)
            }
            const values = inputs.map((input) =>
              relation.sourceColumns.map((field) => input[0][field.name])
            )
            return inArrayMultiple(relation.targetColumns, values, targetTable)
          })()
          const selectedColumns = getSelectedColumns(
            targetTable,
            inputs.map((input) => input[1])
          )

          const list = await (this.db as any)
            .select({ ...selectedColumns, ...referenceColumns })
            .from(targetTable)
            .where(where)

          const groups = new Map<string, any>()
          for (const item of list) {
            const key = getKeyByReference(item)
            isList
              ? groups.set(key, [...(groups.get(key) ?? []), item])
              : groups.set(key, item)
          }
          return inputs.map(([parent]) => {
            const key = getKeyByField(parent)
            return groups.get(key) ?? (isList ? [] : null)
          })
        }
      )
    }

    return new FieldFactoryWithResolve(
      isList ? output.$list() : output.$nullable(),
      {
        ...options,
        dependencies: ["tableName"],
        resolve: (parent, _input, payload) => {
          const loader = (() => {
            if (!payload) return initLoader()
            const memoMap = getMemoizationMap(payload)
            if (!memoMap.has(initLoader)) memoMap.set(initLoader, initLoader())
            return memoMap.get(initLoader) as ReturnType<typeof initLoader>
          })()
          return loader.load([parent, payload])
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

function matchQueryBuilder(
  queries: Record<string, any>,
  targetTable: any
): AnyQueryBuilder | undefined {
  for (const qb of Object.values(queries)) {
    if (qb.table != null && qb.table === targetTable) {
      return qb
    }
  }
}
