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
  capitalize,
  createMemoization,
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
  and,
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
import { DrizzleWeaver, type TableSilk } from ".."
import { inArrayMultiple } from "../helper"
import {
  type ColumnFilters,
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
  AnyQueryBuilder,
  BaseDatabase,
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
  protected readonly queryBuilder: QueryBuilder<
    TDatabase,
    InferTableName<TTable>
  >
  public constructor(
    protected readonly db: TDatabase,
    protected readonly table: TTable
  ) {
    this.inputFactory = new DrizzleInputFactory(table)
    this.tableName = getTableName(table)
    const queryBuilder = this.db.query[
      this.tableName as keyof typeof this.db.query
    ] as QueryBuilder<TDatabase, InferTableName<TTable>>

    if (!queryBuilder) {
      throw new Error(
        `GQLoom-Drizzle Error: Table ${this.tableName} not found in drizzle instance. Did you forget to pass schema to drizzle constructor?`
      )
    }
    this.queryBuilder = queryBuilder
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
    const queryBase = this.queryBuilder
    input ??= silk<
      InferSelectArrayOptions<TDatabase, TTable>,
      SelectArrayArgs<TTable>
    >(
      () => this.inputFactory.selectArrayArgs(),
      (args) => ({
        value: {
          where: {
            RAW: (table: Table) => this.extractFilters(args.where, table),
          },
          orderBy: args.orderBy,
          limit: args.limit,
          offset: args.offset,
        },
      })
    ) as GraphQLSilk<InferSelectArrayOptions<TDatabase, TTable>, TInputI>

    return new QueryFactoryWithResolve(this.output.$list(), {
      input,
      ...options,
      resolve: (opts) => {
        return queryBase.findMany(opts)
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
    const queryBase = this.queryBuilder
    input ??= silk<
      InferSelectSingleOptions<TDatabase, TTable>,
      SelectSingleArgs<TTable>
    >(
      () => this.inputFactory.selectSingleArgs(),
      (args) => ({
        value: {
          where: {
            RAW: (table: Table) => this.extractFilters(args.where, table),
          },
          orderBy: args.orderBy,
          offset: args.offset,
        },
      })
    ) as GraphQLSilk<InferSelectSingleOptions<TDatabase, TTable>, TInputI>

    return new QueryFactoryWithResolve(this.output.$nullable(), {
      input,
      ...options,
      resolve: (opts) => {
        return queryBase.findFirst(opts) as any
      },
    } as QueryOptions<any, any>)
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

  public relationField<
    TRelationName extends keyof InferTableRelationalConfig<
      QueryBuilder<TDatabase, InferTableName<TTable>>
    >["relations"],
  >(
    relationName: TRelationName,
    options?: GraphQLFieldOptions & {
      middlewares?: Middleware<
        InferTableRelationalConfig<
          QueryBuilder<TDatabase, InferTableName<TTable>>
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
    QueryBuilder<TDatabase, InferTableName<TTable>>
  >["relations"][TRelationName] extends Many<any, any>
    ? RelationManyField<
        TTable,
        InferRelationTable<TDatabase, TTable, TRelationName>
      >
    : RelationOneField<
        TTable,
        InferRelationTable<TDatabase, TTable, TRelationName>
      > {
    const relation = this.db._.relations["config"]?.[this.tableName]?.[
      relationName
    ] as Relation
    const targetTable = relation?.targetTable
    if (!relation || !(targetTable instanceof Table)) {
      throw new Error(
        `GQLoom-Drizzle Error: Relation ${this.tableName}.${String(
          relationName
        )} not found in drizzle instance. Did you forget to pass relations to drizzle constructor?`
      )
    }

    const output = DrizzleWeaver.unravel(targetTable)
    const tableName = getTableName(targetTable)
    const queryBuilder = this.db.query[
      tableName as keyof typeof this.db.query
    ] as AnyQueryBuilder

    const isList = relation instanceof Many
    const fieldsLength = relation.sourceColumns.length

    const getKeyByField = (parent: any) => {
      if (fieldsLength === 1) {
        return parent[relation.sourceColumns[0].name]
      }
      return relation.sourceColumns.map((field) => parent[field.name]).join("-")
    }

    const getKeyByReference = (item: any) => {
      if (fieldsLength === 1) {
        return item[relation.targetColumns[0].name]
      }
      return relation.targetColumns
        .map((reference) => item[reference.name])
        .join("-")
    }

    const useLoader = createMemoization(() => {
      return new EasyDataLoader(async (parents: any[]) => {
        const where = (() => {
          if (fieldsLength === 1) {
            const values = parents.map(
              (parent) => parent[relation.sourceColumns[0].name]
            )
            // return inArray(relation.targetColumns[0], values)
            return {
              [relation.targetColumns[0].name]: { in: values },
            }
          }
          const values = parents.map((parent) =>
            relation.sourceColumns.map((field) => parent[field.name])
          )
          return {
            RAW: (table: Table) =>
              inArrayMultiple(relation.targetColumns, values, table),
          }
        })()

        const list = await queryBuilder.findMany({ where })

        const groups = new Map<string, any>()
        for (const item of list) {
          const key = getKeyByReference(item)
          isList
            ? groups.set(key, [...(groups.get(key) ?? []), item])
            : groups.set(key, item)
        }
        return parents.map((parent) => {
          const key = getKeyByField(parent)
          return groups.get(key) ?? (isList ? [] : null)
        })
      })
    })

    return new FieldFactoryWithResolve(
      isList ? output.$list() : output.$nullable(),
      {
        ...options,
        resolve: (parent) => {
          const loader = useLoader()
          return loader.load(parent)
        },
      } as FieldOptions<any, any, any>
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

    const fields: Record<string, Loom.Field<any, any, any>> = mapValue(
      this.db._.relations.config[this.tableName] ?? {},
      (_, key) => this.relationField(key)
    )

    return loom.resolver.of(
      this.output,
      {
        ...fields,
        [name]: this.selectArrayQuery(),
        [`${name}Single`]: this.selectSingleQuery(),
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
