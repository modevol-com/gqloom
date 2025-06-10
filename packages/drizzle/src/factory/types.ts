import type {
  FieldFactoryWithResolve,
  GraphQLSilk,
  MutationFactoryWithResolve,
  QueryFactoryWithResolve,
} from "@gqloom/core"
import type {
  AnyRelations,
  Column,
  InferSelectModel,
  Many,
  SQL,
  Table,
} from "drizzle-orm"
import type { MySqlDatabase } from "drizzle-orm/mysql-core"
import type { RelationalQueryBuilder as MySqlRelationalQueryBuilder } from "drizzle-orm/mysql-core/query-builders/query"
import type { PgDatabase } from "drizzle-orm/pg-core"
import type { RelationalQueryBuilder as PgRelationalQueryBuilder } from "drizzle-orm/pg-core/query-builders/query"
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core"
import type { RelationalQueryBuilder as SQLiteRelationalQueryBuilder } from "drizzle-orm/sqlite-core/query-builders/query"
import type { SelectiveTable } from "../types"
import type {
  CountArgs,
  DeleteArgs,
  InsertArrayArgs,
  InsertArrayWithOnConflictArgs,
  InsertSingleArgs,
  InsertSingleWithOnConflictArgs,
  MutationResult,
  RelationToManyArgs,
  RelationToOneArgs,
  SelectArrayArgs,
  SelectSingleArgs,
  UpdateArgs,
} from "./input"

export type DrizzleResolver<
  TDatabase extends BaseDatabase,
  TTable extends Table,
  TTableName extends string = TTable["_"]["name"],
> =
  | DrizzleResolverReturningItems<TDatabase, TTable, TTableName>
  | DrizzleResolverReturningSuccess<TDatabase, TTable, TTableName>

export type DrizzleQueriesResolver<
  TTable extends Table,
  TTableName extends string = TTable["_"]["name"],
> = {
  [key in TTableName]: SelectArrayQuery<TTable>
} & {
  [key in `${TTableName}Single`]: SelectSingleQuery<TTable>
} & {
  [key in `${TTableName}Count`]: CountQuery<TTable>
}

export type DrizzleResolverReturningItems<
  TDatabase extends BaseDatabase,
  TTable extends Table,
  TTableName extends string = TTable["_"]["name"],
> = DrizzleQueriesResolver<TTable, TTableName> & {
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
> = DrizzleQueriesResolver<TTable, TTableName> & {
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
    QueryBuilder<TDatabase, TTable>
  >["relations"]]: InferTableRelationalConfig<
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
}

export interface SelectArrayQuery<
  TTable extends Table,
  TInputI = SelectArrayArgs<TTable>,
> extends QueryFactoryWithResolve<
    SelectArrayOptions | undefined,
    GraphQLSilk<InferSelectModel<TTable>[], InferSelectModel<TTable>[]>,
    GraphQLSilk<SelectArrayOptions, TInputI>
  > {}

export interface SelectArrayOptions {
  where?: SQL
  orderBy?: (Column | SQL | SQL.Aliased)[]
  limit?: number
  offset?: number
}

export interface CountQuery<TTable extends Table, TInputI = CountArgs<TTable>>
  extends QueryFactoryWithResolve<
    CountOptions,
    GraphQLSilk<number, number>,
    GraphQLSilk<CountOptions, TInputI>
  > {}

export interface CountOptions {
  where?: SQL
}

export interface SelectSingleQuery<
  TTable extends Table,
  TInputI = SelectSingleArgs<TTable>,
> extends QueryFactoryWithResolve<
    SelectSingleOptions | undefined,
    GraphQLSilk<
      InferSelectModel<TTable> | null | undefined,
      InferSelectModel<TTable> | null | undefined
    >,
    GraphQLSilk<SelectSingleOptions, TInputI>
  > {}

export interface SelectSingleOptions {
  where?: SQL
  orderBy?: (Column | SQL | SQL.Aliased)[]
  offset?: number
}

export type RelationField<
  TDatabase extends BaseDatabase,
  TTable extends Table,
  TRelationName extends keyof InferTableRelationalConfig<
    QueryBuilder<TDatabase, TTable>
  >["relations"],
> = InferTableRelationalConfig<
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

export interface RelationManyField<
  TTable extends Table,
  TRelationTable extends Table,
  TInputI = RelationToManyArgs<TRelationTable>,
> extends FieldFactoryWithResolve<
    GraphQLSilk<SelectiveTable<TTable>, SelectiveTable<TTable>>,
    GraphQLSilk<
      InferSelectModel<TRelationTable>[],
      InferSelectModel<TRelationTable>[]
    >,
    QueryToManyFieldOptions<TRelationTable>,
    GraphQLSilk<QueryToManyFieldOptions<TRelationTable>, TInputI>
  > {}

export interface QueryToManyFieldOptions<TTable extends Table> {
  where?: SQL | ((table: TTable) => SQL | undefined)
  orderBy?: Partial<Record<string, "asc" | "desc">>
  limit?: number
  offset?: number
}

export interface RelationOneField<
  TTable extends Table,
  TRelationTable extends Table,
  TInputI = RelationToOneArgs<TTable>,
> extends FieldFactoryWithResolve<
    GraphQLSilk<SelectiveTable<TTable>, SelectiveTable<TTable>>,
    GraphQLSilk<
      InferSelectModel<TRelationTable> | null | undefined,
      InferSelectModel<TRelationTable> | null | undefined
    >,
    QueryToOneFieldOptions<TRelationTable>,
    GraphQLSilk<QueryToOneFieldOptions<TRelationTable>, TInputI>
  > {}

export interface QueryToOneFieldOptions<TTable extends Table> {
  where?: SQL | ((table: TTable) => SQL | undefined)
}

export type QueryFieldOptions<
  TDatabase extends BaseDatabase,
  TTable extends Table,
  TRelationName extends keyof InferTableRelationalConfig<
    QueryBuilder<TDatabase, TTable>
  >["relations"],
> = InferTableRelationalConfig<
  QueryBuilder<TDatabase, TTable>
>["relations"][TRelationName] extends Many<any, any>
  ? QueryToManyFieldOptions<
      InferRelationTable<TDatabase, TTable, TRelationName>
    >
  : QueryToOneFieldOptions<InferRelationTable<TDatabase, TTable, TRelationName>>

export type InsertArrayMutation<
  TTable extends Table,
  TInputI = InsertArrayArgs<TTable>,
> =
  | InsertArrayMutationReturningItems<TTable, TInputI>
  | InsertArrayMutationReturningSuccess<TTable, TInputI>

export interface InsertArrayMutationReturningItems<
  TTable extends Table,
  TInputI = InsertArrayWithOnConflictArgs<TTable>,
> extends MutationFactoryWithResolve<
    InsertArrayWithOnConflictArgs<TTable>,
    GraphQLSilk<InferSelectModel<TTable>[], InferSelectModel<TTable>[]>,
    GraphQLSilk<InsertArrayWithOnConflictArgs<TTable>, TInputI>
  > {}

export interface InsertArrayMutationReturningSuccess<
  TTable extends Table,
  TInputI = InsertArrayArgs<TTable>,
> extends MutationFactoryWithResolve<
    InsertArrayArgs<TTable>,
    GraphQLSilk<MutationResult, MutationResult>,
    GraphQLSilk<InsertArrayArgs<TTable>, TInputI>
  > {}

export type InsertSingleMutation<
  TTable extends Table,
  TInputI = InsertSingleArgs<TTable>,
> =
  | InsertSingleMutationReturningItem<TTable, TInputI>
  | InsertSingleMutationReturningSuccess<TTable, TInputI>

export interface InsertSingleMutationReturningItem<
  TTable extends Table,
  TInputI = InsertSingleWithOnConflictArgs<TTable>,
> extends MutationFactoryWithResolve<
    InsertSingleWithOnConflictArgs<TTable>,
    GraphQLSilk<
      InferSelectModel<TTable> | null | undefined,
      InferSelectModel<TTable> | null | undefined
    >,
    GraphQLSilk<InsertSingleWithOnConflictArgs<TTable>, TInputI>
  > {}

export interface InsertSingleMutationReturningSuccess<
  TTable extends Table,
  TInputI = InsertSingleArgs<TTable>,
> extends MutationFactoryWithResolve<
    InsertSingleArgs<TTable>,
    GraphQLSilk<MutationResult, MutationResult>,
    GraphQLSilk<InsertSingleArgs<TTable>, TInputI>
  > {}

export type UpdateMutation<TTable extends Table, TInputI = UpdateArgs<TTable>> =
  | UpdateMutationReturningItems<TTable, TInputI>
  | UpdateMutationReturningSuccess<TTable, TInputI>

export interface UpdateMutationReturningItems<
  TTable extends Table,
  TInputI = UpdateArgs<TTable>,
> extends MutationFactoryWithResolve<
    UpdateArgs<TTable>,
    GraphQLSilk<InferSelectModel<TTable>[], InferSelectModel<TTable>[]>,
    GraphQLSilk<UpdateArgs<TTable>, TInputI>
  > {}

export interface UpdateMutationReturningSuccess<
  TTable extends Table,
  TInputI = UpdateArgs<TTable>,
> extends MutationFactoryWithResolve<
    UpdateArgs<TTable>,
    GraphQLSilk<MutationResult, MutationResult>,
    GraphQLSilk<UpdateArgs<TTable>, TInputI>
  > {}

export type DeleteMutation<TTable extends Table, TInputI = DeleteArgs<TTable>> =
  | DeleteMutationReturningItems<TTable, TInputI>
  | DeleteMutationReturningSuccess<TTable, TInputI>

export interface DeleteMutationReturningItems<
  TTable extends Table,
  TInputI = DeleteArgs<TTable>,
> extends MutationFactoryWithResolve<
    DeleteArgs<TTable>,
    GraphQLSilk<InferSelectModel<TTable>[], InferSelectModel<TTable>[]>,
    GraphQLSilk<DeleteArgs<TTable>, TInputI>
  > {}

export interface DeleteMutationReturningSuccess<
  TTable extends Table,
  TInputI = DeleteArgs<TTable>,
> extends MutationFactoryWithResolve<
    DeleteArgs<TTable>,
    GraphQLSilk<MutationResult, MutationResult>,
    GraphQLSilk<DeleteArgs<TTable>, TInputI>
  > {}

export type QueryBuilder<
  TDatabase extends BaseDatabase,
  TTable extends Table,
> = TDatabase["query"] extends {
  [key in InferTableTsName<TDatabase, TTable>]: any
}
  ? TDatabase["query"][InferTableTsName<TDatabase, TTable>]
  : never

export type AnyQueryBuilder =
  | MySqlRelationalQueryBuilder<any, any, any>
  | PgRelationalQueryBuilder<any, any>
  | SQLiteRelationalQueryBuilder<any, any, any>

export type InferTableRelationalConfig<TQueryBuilder extends AnyQueryBuilder> =
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
            infer TTableRelationalConfig
          >
        ? TTableRelationalConfig
        : never

export type BaseDatabase =
  | BaseSQLiteDatabase<any, any, any, AnyRelations, any, any>
  | PgDatabase<any, any, AnyRelations, any, any>
  | MySqlDatabase<any, any, any, AnyRelations, any, any>

export type InferTablesConfig<TDatabase extends BaseDatabase> =
  TDatabase extends BaseSQLiteDatabase<
    any,
    any,
    any,
    any,
    infer TTablesConfig,
    any
  >
    ? TTablesConfig
    : TDatabase extends PgDatabase<any, any, any, infer TTablesConfig, any>
      ? TTablesConfig
      : TDatabase extends MySqlDatabase<
            any,
            any,
            any,
            any,
            infer TTablesConfig,
            any
          >
        ? TTablesConfig
        : never

export type InferTableTsName<
  TDatabase extends BaseDatabase,
  TTable extends Table,
> = Extract<
  ValueOf<InferTablesConfig<TDatabase>>,
  { dbName: TTable["_"]["name"] }
>["tsName"]

export type InferTableName<TTable extends Table> = TTable["_"]["name"]

export type InferRelationTable<
  TDatabase extends BaseDatabase,
  TTable extends Table,
  TTargetTableName extends
    keyof TDatabase["_"]["relations"]["config"][TTable["_"]["name"]],
> = Extract<
  ValueOf<InferTablesConfig<TDatabase>>,
  {
    dbName: TDatabase["_"]["relations"]["config"][TTable["_"]["name"]][TTargetTableName]["targetTable"]["_"]["name"]
  }
>["table"]

type ValueOf<T> = T[keyof T]
