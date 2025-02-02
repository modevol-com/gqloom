import {
  EasyDataLoader,
  type FieldOrOperation,
  type GraphQLFieldOptions,
  type GraphQLSilk,
  type Middleware,
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
  type Table,
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
  normalizeRelation,
  notIlike,
  notInArray,
  notLike,
  or,
} from "drizzle-orm"
import { MySqlDatabase, type MySqlTable } from "drizzle-orm/mysql-core"
import type { RelationalQueryBuilder as MySqlRelationalQueryBuilder } from "drizzle-orm/mysql-core/query-builders/query"
import { PgDatabase, type PgTable } from "drizzle-orm/pg-core"
import type { RelationalQueryBuilder as PgRelationalQueryBuilder } from "drizzle-orm/pg-core/query-builders/query"
import type { BaseSQLiteDatabase, SQLiteTable } from "drizzle-orm/sqlite-core"
import type { RelationalQueryBuilder as SQLiteRelationalQueryBuilder } from "drizzle-orm/sqlite-core/query-builders/query"
import { GraphQLError } from "graphql"
import { DrizzleWeaver, type TableSilk } from "."
import { inArrayMultiple } from "./helper"
import {
  type ColumnFilters,
  type DeleteArgs,
  DrizzleInputFactory,
  type FiltersCore,
  type InsertArrayArgs,
  type InsertSingleArgs,
  type MutationResult,
  type SelectArrayArgs,
  type SelectSingleArgs,
  type UpdateArgs,
} from "./input-factory"

export abstract class DrizzleResolverFactory<
  TDatabase extends BaseDatabase,
  TTable extends Table,
> {
  static create<
    TDatabase extends BaseSQLiteDatabase<any, any, any, any>,
    TTableName extends keyof NonNullable<TDatabase["_"]["schema"]>,
  >(
    db: TDatabase,
    tableName: TTableName
  ): DrizzleSQLiteResolverFactory<
    TDatabase,
    NonNullable<TDatabase["_"]["fullSchema"]>[TTableName]
  >
  static create<
    TDatabase extends BaseSQLiteDatabase<any, any, any, any>,
    TTable extends SQLiteTable,
  >(
    db: TDatabase,
    table: TTable
  ): DrizzleSQLiteResolverFactory<TDatabase, TTable>

  static create<
    TDatabase extends PgDatabase<any, any, any>,
    TTableName extends keyof NonNullable<TDatabase["_"]["schema"]>,
  >(
    db: TDatabase,
    tableName: TTableName
  ): DrizzlePostgresResolverFactory<
    TDatabase,
    NonNullable<TDatabase["_"]["fullSchema"]>[TTableName]
  >
  static create<
    TDatabase extends PgDatabase<any, any, any>,
    TTable extends PgTable,
  >(
    db: TDatabase,
    table: TTable
  ): DrizzlePostgresResolverFactory<TDatabase, TTable>

  static create<
    TDatabase extends MySqlDatabase<any, any, any, any>,
    TTableName extends keyof NonNullable<TDatabase["_"]["schema"]>,
  >(
    db: TDatabase,
    tableName: TTableName
  ): DrizzleMySQLResolverFactory<
    TDatabase,
    NonNullable<TDatabase["_"]["fullSchema"]>[TTableName]
  >
  static create<
    TDatabase extends MySqlDatabase<any, any, any, any>,
    TTable extends MySqlTable,
  >(
    db: TDatabase,
    table: TTable
  ): DrizzleMySQLResolverFactory<TDatabase, TTable>

  static create(db: BaseDatabase, tableOrName: Table | string) {
    const table =
      typeof tableOrName === "string"
        ? (db._.fullSchema[tableOrName] as Table)
        : tableOrName
    if (db instanceof PgDatabase) {
      return new DrizzlePostgresResolverFactory(db, table as PgTable)
    }
    if (db instanceof MySqlDatabase) {
      return new DrizzleMySQLResolverFactory(db, table as MySqlTable)
    }
    return new DrizzleSQLiteResolverFactory(db, table as SQLiteTable)
  }

  protected readonly inputFactory: DrizzleInputFactory<typeof this.table>
  protected readonly tableName: InferTableName<TTable>
  protected readonly queryBuilder: QueryBuilder<
    TDatabase,
    InferTableName<TTable>
  >
  constructor(
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
          where: this.extractFilters(args.where),
          orderBy: this.extractOrderBy(args.orderBy),
          limit: args.limit,
          offset: args.offset,
        },
      })
    ) as GraphQLSilk<InferSelectArrayOptions<TDatabase, TTable>, TInputI>

    return loom.query(this.output.$list(), {
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
    const queryBase = this.queryBuilder
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

    return loom.query(this.output.$nullable(), {
      input,
      ...options,
      resolve: (opts) => {
        return queryBase.findFirst(opts) as any
      },
    })
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
        >["relations"][TRelationName] extends Many<any>
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
  >["relations"][TRelationName] extends Many<any>
    ? RelationManyField<
        TTable,
        InferRelationTable<TDatabase, TTable, TRelationName>
      >
    : RelationOneField<
        TTable,
        InferRelationTable<TDatabase, TTable, TRelationName>
      > {
    const relation = this.db._.schema?.[this.tableName]?.relations?.[
      relationName
    ] as Relation
    if (!relation) {
      throw new Error(
        `GQLoom-Drizzle Error: Relation ${this.tableName}.${String(relationName)} not found in drizzle instance. Did you forget to pass relations to drizzle constructor?`
      )
    }
    const output = DrizzleWeaver.unravel(relation.referencedTable)
    const tableName = getTableName(relation.referencedTable)
    const queryBuilder = this.db.query[
      tableName as keyof typeof this.db.query
    ] as AnyQueryBuilder

    const normalizedRelation = normalizeRelation(
      this.db._.schema,
      this.db._.tableNamesMap,
      relation
    )
    const isList = relation instanceof Many
    const fieldsLength = normalizedRelation.fields.length

    const getKeyByField = (parent: any) => {
      if (fieldsLength === 1) {
        return parent[normalizedRelation.fields[0].name]
      }
      return normalizedRelation.fields
        .map((field) => parent[field.name])
        .join("-")
    }

    const getKeyByReference = (item: any) => {
      if (fieldsLength === 1) {
        return item[normalizedRelation.references[0].name]
      }
      return normalizedRelation.references
        .map((reference) => item[reference.name])
        .join("-")
    }

    const useLoader = createMemoization(() => {
      return new EasyDataLoader(async (parents: any[]) => {
        const where = (() => {
          if (fieldsLength === 1) {
            const values = parents.map(
              (parent) => parent[normalizedRelation.fields[0].name]
            )
            return inArray(normalizedRelation.references[0], values)
          }
          const values = parents.map((parent) =>
            normalizedRelation.fields.map((field) => parent[field.name])
          )
          return inArrayMultiple(normalizedRelation.references, values)
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

    return loom.field(isList ? output.$list() : output.$nullable(), {
      ...options,
      resolve: (parent) => {
        const loader = useLoader()
        return loader.load(parent)
      },
    }) as any
  }

  public resolver<TTableName extends string = TTable["_"]["name"]>(options?: {
    name?: TTableName
    middlewares?: Middleware[]
  }): DrizzleResolver<TDatabase, TTable, TTableName> {
    const name = options?.name ?? this.tableName

    const fields: Record<
      string,
      FieldOrOperation<any, any, any, any>
    > = mapValue(
      this.db._.schema?.[this.tableName]?.relations ?? {},
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
      middlewares?: Middleware<InsertArrayMutation<TTable, TInputI>>[]
    }
  ): InsertArrayMutation<TTable, TInputI>

  public abstract insertSingleMutation<TInputI = InsertSingleArgs<TTable>>(
    options?: GraphQLFieldOptions & {
      input?: GraphQLSilk<InsertSingleArgs<TTable>, TInputI>
      middlewares?: Middleware<InsertSingleMutation<TTable, TInputI>>[]
    }
  ): InsertSingleMutation<TTable, TInputI>

  public abstract updateMutation<TInputI = UpdateArgs<TTable>>(
    options?: GraphQLFieldOptions & {
      input?: GraphQLSilk<UpdateArgs<TTable>, TInputI>
      middlewares?: Middleware<UpdateMutation<TTable, TInputI>>[]
    }
  ): UpdateMutation<TTable, TInputI>

  public abstract deleteMutation<TInputI = DeleteArgs<TTable>>(
    options?: GraphQLFieldOptions & {
      input?: GraphQLSilk<DeleteArgs<TTable>, TInputI>
      middlewares?: Middleware<DeleteMutation<TTable, TInputI>>[]
    }
  ): DeleteMutation<TTable, TInputI>
}

export class DrizzleMySQLResolverFactory<
  TDatabase extends MySqlDatabase<any, any, any, any>,
  TTable extends MySqlTable,
> extends DrizzleResolverFactory<TDatabase, TTable> {
  protected static get mutationResult() {
    return silk<MutationResult, MutationResult>(() =>
      DrizzleInputFactory.mutationResult()
    )
  }

  public insertArrayMutation<TInputI = InsertArrayArgs<TTable>>({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<InsertArrayArgs<TTable>, TInputI>
    middlewares?: Middleware<
      InsertArrayMutationReturningSuccess<TTable, TInputI>
    >[]
  } = {}): InsertArrayMutationReturningSuccess<TTable, TInputI> {
    input ??= silk(() => this.inputFactory.insertArrayArgs())

    return loom.mutation(DrizzleMySQLResolverFactory.mutationResult, {
      ...options,
      input,
      resolve: async (input) => {
        await this.db.insert(this.table).values(input.values)
        return { isSuccess: true }
      },
    })
  }

  public insertSingleMutation<TInputI = InsertSingleArgs<TTable>>({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<InsertSingleArgs<TTable>, TInputI>
    middlewares?: Middleware<
      InsertSingleMutationReturningSuccess<TTable, TInputI>
    >[]
  } = {}): InsertSingleMutationReturningSuccess<TTable, TInputI> {
    input ??= silk(() => this.inputFactory.insertSingleArgs())

    return loom.mutation(DrizzleMySQLResolverFactory.mutationResult, {
      ...options,
      input,
      resolve: async (args) => {
        await this.db.insert(this.table).values(args.value)
        return { isSuccess: true }
      },
    })
  }

  public updateMutation<TInputI = UpdateArgs<TTable>>({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<UpdateArgs<TTable>, TInputI>
    middlewares?: Middleware<UpdateMutationReturningSuccess<TTable, TInputI>>[]
  } = {}): UpdateMutationReturningSuccess<TTable, TInputI> {
    input ??= silk(() => this.inputFactory.updateArgs())

    return loom.mutation(DrizzleMySQLResolverFactory.mutationResult, {
      ...options,
      input,
      resolve: async (args) => {
        let query = this.db.update(this.table).set(args.set)
        if (args.where) {
          query = query.where(this.extractFilters(args.where)) as any
        }

        await query

        return { isSuccess: true }
      },
    })
  }

  public deleteMutation<TInputI = DeleteArgs<TTable>>({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<DeleteArgs<TTable>, TInputI>
    middlewares?: Middleware<DeleteMutationReturningSuccess<TTable, TInputI>>[]
  } = {}): DeleteMutationReturningSuccess<TTable, TInputI> {
    input ??= silk(() => this.inputFactory.deleteArgs())

    return loom.mutation(DrizzleMySQLResolverFactory.mutationResult, {
      ...options,
      input,
      resolve: async (args) => {
        let query = this.db.delete(this.table)
        if (args.where) {
          query = query.where(this.extractFilters(args.where)) as any
        }
        await query
        return { isSuccess: true }
      },
    })
  }

  public resolver<TTableName extends string = TTable["_"]["name"]>(
    options: {
      name?: TTableName
      middlewares?: Middleware[]
    } = {}
  ): DrizzleResolverReturningSuccess<TDatabase, TTable, TTableName> {
    return super.resolver(options) as DrizzleResolverReturningSuccess<
      TDatabase,
      TTable,
      TTableName
    >
  }
}

export class DrizzlePostgresResolverFactory<
  TDatabase extends PgDatabase<any, any, any>,
  TTable extends PgTable,
> extends DrizzleResolverFactory<TDatabase, TTable> {
  public insertArrayMutation<TInputI = InsertArrayArgs<TTable>>({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<InsertArrayArgs<TTable>, TInputI>
    middlewares?: Middleware<
      InsertArrayMutationReturningItems<TTable, TInputI>
    >[]
  } = {}): InsertArrayMutationReturningItems<TTable, TInputI> {
    input ??= silk(() => this.inputFactory.insertArrayArgs())

    return loom.mutation(this.output.$list(), {
      ...options,
      input,
      resolve: async (args) => {
        const result = await this.db
          .insert(this.table)
          .values(args.values)
          .returning()
          .onConflictDoNothing()

        return result
      },
    })
  }

  public insertSingleMutation<TInputI = InsertSingleArgs<TTable>>({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<InsertSingleArgs<TTable>, TInputI>
    middlewares?: Middleware<
      InsertSingleMutationReturningItem<TTable, TInputI>
    >[]
  } = {}): InsertSingleMutationReturningItem<TTable, TInputI> {
    input ??= silk(() => this.inputFactory.insertSingleArgs())

    return loom.mutation(this.output.$nullable(), {
      ...options,
      input,
      resolve: async (args) => {
        const result = await this.db
          .insert(this.table)
          .values(args.value)
          .returning()
          .onConflictDoNothing()

        return result[0] as any
      },
    })
  }

  public updateMutation<TInputI = UpdateArgs<TTable>>({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<UpdateArgs<TTable>, TInputI>
    middlewares?: Middleware<UpdateMutationReturningItems<TTable, TInputI>>[]
  } = {}): UpdateMutationReturningItems<TTable, TInputI> {
    input ??= silk(() => this.inputFactory.updateArgs())

    return loom.mutation(this.output.$list(), {
      ...options,
      input,
      resolve: async (args) => {
        const query = this.db.update(this.table).set(args.set)
        if (args.where) {
          query.where(this.extractFilters(args.where))
        }
        return await query.returning()
      },
    })
  }

  public deleteMutation<TInputI = DeleteArgs<TTable>>({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<DeleteArgs<TTable>, TInputI>
    middlewares?: Middleware<DeleteMutationReturningItems<TTable, TInputI>>[]
  } = {}): DeleteMutationReturningItems<TTable, TInputI> {
    input ??= silk(() => this.inputFactory.deleteArgs())

    return loom.mutation(this.output.$list(), {
      ...options,
      input,
      resolve: async (args) => {
        const query = this.db.delete(this.table)
        if (args.where) {
          query.where(this.extractFilters(args.where))
        }
        return await query.returning()
      },
    })
  }

  public resolver<TTableName extends string = TTable["_"]["name"]>(
    options: {
      name?: TTableName
      middlewares?: Middleware[]
    } = {}
  ): DrizzleResolverReturningItems<TDatabase, TTable, TTableName> {
    return super.resolver(options) as DrizzleResolverReturningItems<
      TDatabase,
      TTable,
      TTableName
    >
  }
}

export class DrizzleSQLiteResolverFactory<
  TDatabase extends BaseSQLiteDatabase<any, any, any, any>,
  TTable extends SQLiteTable,
> extends DrizzleResolverFactory<TDatabase, TTable> {
  public insertArrayMutation<TInputI = InsertArrayArgs<TTable>>({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<InsertArrayArgs<TTable>, TInputI>
    middlewares?: Middleware<
      InsertArrayMutationReturningItems<TTable, TInputI>
    >[]
  } = {}): InsertArrayMutationReturningItems<TTable, TInputI> {
    input ??= silk(() => this.inputFactory.insertArrayArgs())

    return loom.mutation(this.output.$list(), {
      ...options,
      input,
      resolve: async (args) => {
        const result = await this.db
          .insert(this.table)
          .values(args.values)
          .returning()
          .onConflictDoNothing()
        return result
      },
    })
  }

  public insertSingleMutation<TInputI = InsertSingleArgs<TTable>>({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<InsertSingleArgs<TTable>, TInputI>
    middlewares?: Middleware<
      InsertSingleMutationReturningItem<TTable, TInputI>
    >[]
  } = {}): InsertSingleMutationReturningItem<TTable, TInputI> {
    input ??= silk(() => this.inputFactory.insertSingleArgs())
    return loom.mutation(this.output.$nullable(), {
      ...options,
      input,
      resolve: async (args) => {
        const result = await this.db
          .insert(this.table)
          .values(args.value)
          .returning()
          .onConflictDoNothing()

        return result[0] as any
      },
    })
  }

  public updateMutation<TInputI = UpdateArgs<TTable>>({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<UpdateArgs<TTable>, TInputI>
    middlewares?: Middleware<UpdateMutationReturningItems<TTable, TInputI>>[]
  } = {}): UpdateMutationReturningItems<TTable, TInputI> {
    input ??= silk(() => this.inputFactory.updateArgs())

    return loom.mutation(this.output.$list(), {
      ...options,
      input,
      resolve: async (args) => {
        const query = this.db.update(this.table).set(args.set)
        if (args.where) {
          query.where(this.extractFilters(args.where))
        }
        return await query.returning()
      },
    })
  }

  public deleteMutation<TInputI = DeleteArgs<TTable>>({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<DeleteArgs<TTable>, TInputI>
    middlewares?: Middleware<DeleteMutationReturningItems<TTable, TInputI>>[]
  } = {}): DeleteMutationReturningItems<TTable, TInputI> {
    input ??= silk(() => this.inputFactory.deleteArgs())

    return loom.mutation(this.output.$list(), {
      ...options,
      input,
      resolve: async (args) => {
        const query = this.db.delete(this.table)
        if (args.where) {
          query.where(this.extractFilters(args.where))
        }
        return await query.returning()
      },
    })
  }

  public resolver<TTableName extends string = TTable["_"]["name"]>(
    options: {
      name?: TTableName
      middlewares?: Middleware[]
    } = {}
  ): DrizzleResolverReturningItems<TDatabase, TTable, TTableName> {
    return super.resolver(options) as DrizzleResolverReturningItems<
      TDatabase,
      TTable,
      TTableName
    >
  }
}

export const drizzleResolverFactory = DrizzleResolverFactory.create

export type DrizzleResolver<
  TDatabase extends BaseDatabase,
  TTable extends Table,
  TTableName extends string = TTable["_"]["name"],
> =
  | DrizzleResolverReturningItems<TDatabase, TTable, TTableName>
  | DrizzleResolverReturningSuccess<TDatabase, TTable, TTableName>

export type DrizzleResolverReturningItems<
  TDatabase extends BaseDatabase,
  TTable extends Table,
  TTableName extends string = TTable["_"]["name"],
> = {
  [key in TTableName]: SelectArrayQuery<TDatabase, TTable>
} & {
  [key in `${TTableName}Single`]: SelectArrayQuery<TDatabase, TTable>
} & {
  [key in `insertInto${Capitalize<TTableName>}`]: InsertArrayMutationReturningItems<TTable>
} & {
  [key in `insertInto${Capitalize<TTableName>}Single`]: InsertSingleMutationReturningItem<TTable>
} & {
  [key in `update${Capitalize<TTableName>}`]: UpdateMutationReturningItems<TTable>
} & {
  [key in `deleteFrom${Capitalize<TTableName>}`]: DeleteMutationReturningItems<TTable>
} & DrizzleResolverRelations<TDatabase, TTable>

export type DrizzleResolverReturningSuccess<
  TDatabase extends BaseDatabase,
  TTable extends Table,
  TTableName extends string = TTable["_"]["name"],
> = {
  [key in TTableName]: SelectArrayQuery<TDatabase, TTable>
} & {
  [key in `${TTableName}Single`]: SelectArrayQuery<TDatabase, TTable>
} & {
  [key in `insertInto${Capitalize<TTableName>}`]: InsertArrayMutationReturningSuccess<TTable>
} & {
  [key in `insertInto${Capitalize<TTableName>}Single`]: InsertSingleMutationReturningSuccess<TTable>
} & {
  [key in `update${Capitalize<TTableName>}`]: UpdateMutationReturningSuccess<TTable>
} & {
  [key in `deleteFrom${Capitalize<TTableName>}`]: DeleteMutationReturningSuccess<TTable>
} & DrizzleResolverRelations<TDatabase, TTable>

export type DrizzleResolverRelations<
  TDatabase extends BaseDatabase,
  TTable extends Table,
> = {
  [TRelationName in keyof InferTableRelationalConfig<
    QueryBuilder<TDatabase, InferTableName<TTable>>
  >["relations"]]: InferTableRelationalConfig<
    QueryBuilder<TDatabase, InferTableName<TTable>>
  >["relations"][TRelationName] extends Many<any>
    ? RelationManyField<
        TTable,
        InferRelationTable<TDatabase, TTable, TRelationName>
      >
    : RelationOneField<
        TTable,
        InferRelationTable<TDatabase, TTable, TRelationName>
      >
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
> = Parameters<QueryBuilder<TDatabase, TTable["_"]["name"]>["findMany"]>[0]

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
> = Parameters<QueryBuilder<TDatabase, TTable["_"]["name"]>["findFirst"]>[0]

export interface RelationManyField<
  TTable extends Table,
  TRelationTable extends Table,
> extends FieldOrOperation<
    GraphQLSilk<InferSelectModel<TTable>, InferSelectModel<TTable>>,
    GraphQLSilk<
      InferSelectModel<TRelationTable>[],
      InferSelectModel<TRelationTable>[]
    >,
    undefined,
    "field"
  > {}

export interface RelationOneField<
  TTable extends Table,
  TRelationTable extends Table,
> extends FieldOrOperation<
    GraphQLSilk<InferSelectModel<TTable>, InferSelectModel<TTable>>,
    GraphQLSilk<
      InferSelectModel<TRelationTable> | null | undefined,
      InferSelectModel<TRelationTable> | null | undefined
    >,
    undefined,
    "field"
  > {}

export type InsertArrayMutation<
  TTable extends Table,
  TInputI = InsertArrayArgs<TTable>,
> =
  | InsertArrayMutationReturningItems<TTable, TInputI>
  | InsertArrayMutationReturningSuccess<TTable, TInputI>

export interface InsertArrayMutationReturningItems<
  TTable extends Table,
  TInputI = InsertArrayArgs<TTable>,
> extends FieldOrOperation<
    undefined,
    GraphQLSilk<InferSelectModel<TTable>[], InferSelectModel<TTable>[]>,
    GraphQLSilk<InsertArrayArgs<TTable>, TInputI>,
    "mutation"
  > {}

export interface InsertArrayMutationReturningSuccess<
  TTable extends Table,
  TInputI = InsertArrayArgs<TTable>,
> extends FieldOrOperation<
    undefined,
    GraphQLSilk<MutationResult, MutationResult>,
    GraphQLSilk<InsertArrayArgs<TTable>, TInputI>,
    "mutation"
  > {}

export type InsertSingleMutation<
  TTable extends Table,
  TInputI = InsertSingleArgs<TTable>,
> =
  | InsertSingleMutationReturningItem<TTable, TInputI>
  | InsertSingleMutationReturningSuccess<TTable, TInputI>

export interface InsertSingleMutationReturningItem<
  TTable extends Table,
  TInputI = InsertSingleArgs<TTable>,
> extends FieldOrOperation<
    undefined,
    GraphQLSilk<
      InferSelectModel<TTable> | null | undefined,
      InferSelectModel<TTable> | null | undefined
    >,
    GraphQLSilk<InsertSingleArgs<TTable>, TInputI>,
    "mutation"
  > {}

export interface InsertSingleMutationReturningSuccess<
  TTable extends Table,
  TInputI = InsertSingleArgs<TTable>,
> extends FieldOrOperation<
    undefined,
    GraphQLSilk<MutationResult, MutationResult>,
    GraphQLSilk<InsertSingleArgs<TTable>, TInputI>,
    "mutation"
  > {}

export type UpdateMutation<TTable extends Table, TInputI = UpdateArgs<TTable>> =
  | UpdateMutationReturningItems<TTable, TInputI>
  | UpdateMutationReturningSuccess<TTable, TInputI>

export interface UpdateMutationReturningItems<
  TTable extends Table,
  TInputI = UpdateArgs<TTable>,
> extends FieldOrOperation<
    undefined,
    GraphQLSilk<InferSelectModel<TTable>[], InferSelectModel<TTable>[]>,
    GraphQLSilk<UpdateArgs<TTable>, TInputI>,
    "mutation"
  > {}

export interface UpdateMutationReturningSuccess<
  TTable extends Table,
  TInputI = UpdateArgs<TTable>,
> extends FieldOrOperation<
    undefined,
    GraphQLSilk<MutationResult, MutationResult>,
    GraphQLSilk<UpdateArgs<TTable>, TInputI>,
    "mutation"
  > {}

export type DeleteMutation<TTable extends Table, TInputI = DeleteArgs<TTable>> =
  | DeleteMutationReturningItems<TTable, TInputI>
  | DeleteMutationReturningSuccess<TTable, TInputI>

export interface DeleteMutationReturningItems<
  TTable extends Table,
  TInputI = DeleteArgs<TTable>,
> extends FieldOrOperation<
    undefined,
    GraphQLSilk<InferSelectModel<TTable>[], InferSelectModel<TTable>[]>,
    GraphQLSilk<DeleteArgs<TTable>, TInputI>,
    "mutation"
  > {}

export interface DeleteMutationReturningSuccess<
  TTable extends Table,
  TInputI = DeleteArgs<TTable>,
> extends FieldOrOperation<
    undefined,
    GraphQLSilk<MutationResult, MutationResult>,
    GraphQLSilk<DeleteArgs<TTable>, TInputI>,
    "mutation"
  > {}

type QueryBuilder<
  TDatabase extends BaseDatabase,
  TTableName extends keyof TDatabase["_"]["schema"],
> = TDatabase["query"] extends { [key in TTableName]: any }
  ? TDatabase["query"][TTableName]
  : never

type AnyQueryBuilder =
  | MySqlRelationalQueryBuilder<any, any, any>
  | PgRelationalQueryBuilder<any, any>
  | SQLiteRelationalQueryBuilder<any, any, any, any>

type InferTableRelationalConfig<TQueryBuilder extends AnyQueryBuilder> =
  TQueryBuilder extends MySqlRelationalQueryBuilder<
    any,
    any,
    infer TTableRelationalConfig
  >
    ? TTableRelationalConfig
    : TQueryBuilder extends PgRelationalQueryBuilder<
          any,
          infer TTableRelationalConfig
        >
      ? TTableRelationalConfig
      : TQueryBuilder extends SQLiteRelationalQueryBuilder<
            any,
            any,
            any,
            infer TTableRelationalConfig
          >
        ? TTableRelationalConfig
        : never

type BaseDatabase =
  | BaseSQLiteDatabase<any, any, any, any>
  | PgDatabase<any, any, any>
  | MySqlDatabase<any, any, any, any>

type InferTableName<TTable extends Table> = TTable["_"]["name"]

type InferRelationTable<
  TDatabase extends BaseDatabase,
  TTable extends Table,
  TRelationName extends keyof InferTableRelationalConfig<
    QueryBuilder<TDatabase, InferTableName<TTable>>
  >["relations"],
> = TDatabase["_"]["fullSchema"][InferTableRelationalConfig<
  QueryBuilder<TDatabase, InferTableName<TTable>>
>["relations"][TRelationName]["referencedTableName"]]
