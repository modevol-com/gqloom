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
  loom,
  mapValue,
  silk,
} from "@gqloom/core"
import {
  type InferSelectModel,
  Many,
  type Relation,
  Table,
  type TableRelationalConfig,
  type TablesRelationalConfig,
  getTableColumns,
  getTableName,
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
  type CountArgs,
  type DeleteArgs,
  DrizzleInputFactory,
  type InsertArrayArgs,
  type InsertSingleArgs,
  type RelationArgs,
  type RelationToManyArgs,
  type RelationToOneArgs,
  type SelectArrayArgs,
  type SelectSingleArgs,
  type UpdateArgs,
} from "./input"
import {
  RelationFieldSelector,
  RelationFieldsLoader,
} from "./relation-field-loader"
import { DrizzleArgsTransformer } from "./transform"
import type {
  BaseDatabase,
  CountOptions,
  CountQuery,
  DeleteMutation,
  DeleteOptions,
  DrizzleQueriesResolver,
  InferTableName,
  InferTableRelationalConfig,
  InsertArrayMutation,
  InsertArrayOptions,
  InsertSingleMutation,
  InsertSingleOptions,
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
  UpdateOptions,
} from "./types"

export abstract class DrizzleResolverFactory<
  TDatabase extends BaseDatabase,
  TTable extends Table,
> {
  protected readonly inputFactory: DrizzleInputFactory<typeof this.table>
  protected readonly tableName: InferTableName<TTable>
  protected readonly argsTransformer: DrizzleArgsTransformer<TTable>
  public constructor(
    protected readonly db: TDatabase,
    protected readonly table: TTable,
    protected readonly options?: DrizzleResolverFactoryOptions<TTable>
  ) {
    this.inputFactory = new DrizzleInputFactory(table, options)
    this.tableName = getTableName(table)
    this.argsTransformer = new DrizzleArgsTransformer(table)
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
      this.argsTransformer.toSelectArrayOptions
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
      this.argsTransformer.toSelectSingleOptions
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
      this.argsTransformer.toCountOptions
    ) as GraphQLSilk<CountOptions, TInputI>

    return new QueryFactoryWithResolve(silk(new GraphQLNonNull(GraphQLInt)), {
      input,
      ...options,
      resolve: (args: CountOptions) => {
        return this.db.$count(this.table, args.where)
      },
    } as QueryOptions<any, any>)
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
            this.argsTransformer.toQueryToManyFieldOptions
          )
        : silk<QueryToOneFieldOptions<any>, RelationToOneArgs<TTable>>(
            () => targetInputFactory.relationToOneArgs(),
            this.argsTransformer.toQueryToOneFieldOptions
          )
    ) as GraphQLSilk<
      QueryFieldOptions<TDatabase, TTable, TRelationName>,
      TInputI
    >

    /** columnTableName -> columnTsKey */
    const columnKeys = new Map(
      Object.entries(getTableColumns(targetTable)).map(([name, col]) => [
        col.name,
        name,
      ])
    )
    const dependencies = relation.sourceColumns.map(
      (col) => columnKeys.get(col.name) ?? col.name
    )
    const initSelector = () =>
      new RelationFieldSelector(relationName, relation, targetTable)

    return new FieldFactoryWithResolve(
      toMany ? output.$list() : output.$nullable(),
      {
        input,
        ...options,
        dependencies,
        resolve: (parent, input, payload) => {
          const loader = RelationFieldsLoader.getLoaderByPath(
            payload,
            this.db,
            this.table
          )
          return loader.load([initSelector, parent, input, payload])
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
      input?: GraphQLSilk<InsertArrayOptions<TTable>, TInputI>
      middlewares?: Middleware[]
    }
  ): InsertArrayMutation<TTable, TInputI>

  public abstract insertSingleMutation<TInputI = InsertSingleArgs<TTable>>(
    options?: GraphQLFieldOptions & {
      input?: GraphQLSilk<InsertSingleOptions<TTable>, TInputI>
      middlewares?: Middleware[]
    }
  ): InsertSingleMutation<TTable, TInputI>

  public abstract updateMutation<TInputI = UpdateArgs<TTable>>(
    options?: GraphQLFieldOptions & {
      input?: GraphQLSilk<UpdateOptions<TTable>, TInputI>
      middlewares?: Middleware[]
    }
  ): UpdateMutation<TTable, TInputI>

  public abstract deleteMutation<TInputI = DeleteArgs<TTable>>(
    options?: GraphQLFieldOptions & {
      input?: GraphQLSilk<DeleteOptions, TInputI>
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
