import {
  type GraphQLFieldOptions,
  type GraphQLSilk,
  type Middleware,
  MutationFactoryWithResolve,
  type MutationOptions,
  type ObjectChainResolver,
  silk,
} from "@gqloom/core"
import type { BaseSQLiteDatabase, SQLiteTable } from "drizzle-orm/sqlite-core"
import type { GraphQLOutputType } from "graphql"
import { getSelectedColumns } from "../helper"
import type { SelectiveTable } from "../types"
import type {
  DeleteArgs,
  InsertArrayWithOnConflictArgs,
  InsertSingleWithOnConflictArgs,
  UpdateArgs,
} from "./input"
import { DrizzleResolverFactory } from "./resolver"
import type {
  DeleteMutationReturningItems,
  DrizzleResolverReturningItems,
  InsertArrayMutationReturningItems,
  InsertSingleMutationReturningItem,
  UpdateMutationReturningItems,
} from "./types"

export class DrizzleSQLiteResolverFactory<
  TDatabase extends BaseSQLiteDatabase<any, any, any, any>,
  TTable extends SQLiteTable,
> extends DrizzleResolverFactory<TDatabase, TTable> {
  public insertArrayMutation<TInputI = InsertArrayWithOnConflictArgs<TTable>>({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<InsertArrayWithOnConflictArgs<TTable>, TInputI>
    middlewares?: Middleware<
      InsertArrayMutationReturningItems<TTable, TInputI>
    >[]
  } = {}): InsertArrayMutationReturningItems<TTable, TInputI> {
    input ??= silk(
      () =>
        this.inputFactory.insertArrayWithOnConflictArgs() as GraphQLOutputType
    )

    return new MutationFactoryWithResolve(this.output.$list(), {
      ...options,
      input,
      resolve: async (args: InsertArrayWithOnConflictArgs<TTable>, payload) => {
        let query: any = this.db.insert(this.table).values(args.values)
        if (args.onConflictDoUpdate) {
          query = query.onConflictDoUpdate({
            target: args.onConflictDoUpdate.target.map((t) => this.toColumn(t)),
            set: args.onConflictDoUpdate.set,
            targetWhere: this.extractFilters(
              args.onConflictDoUpdate.targetWhere
            ),
            setWhere: this.extractFilters(args.onConflictDoUpdate.setWhere),
          })
        }
        if (args.onConflictDoNothing) {
          query = query.onConflictDoNothing({
            target: args.onConflictDoNothing.target?.map((t) =>
              this.toColumn(t)
            ),
            where: this.extractFilters(args.onConflictDoNothing.where),
          })
        }
        return await query.returning(getSelectedColumns(this.table, payload))
      },
    } as MutationOptions<any, any>)
  }

  public insertSingleMutation<
    TInputI = InsertSingleWithOnConflictArgs<TTable>,
  >({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<InsertSingleWithOnConflictArgs<TTable>, TInputI>
    middlewares?: Middleware<
      InsertSingleMutationReturningItem<TTable, TInputI>
    >[]
  } = {}): InsertSingleMutationReturningItem<TTable, TInputI> {
    input ??= silk(
      () =>
        this.inputFactory.insertSingleWithOnConflictArgs() as GraphQLOutputType
    )
    return new MutationFactoryWithResolve(this.output.$nullable(), {
      ...options,
      input,
      resolve: async (
        args: InsertSingleWithOnConflictArgs<TTable>,
        payload
      ) => {
        let query: any = this.db.insert(this.table).values(args.value)
        if (args.onConflictDoUpdate) {
          query = query.onConflictDoUpdate({
            target: args.onConflictDoUpdate.target.map((t) => this.toColumn(t)),
            set: args.onConflictDoUpdate.set,
            targetWhere: this.extractFilters(
              args.onConflictDoUpdate.targetWhere
            ),
            setWhere: this.extractFilters(args.onConflictDoUpdate.setWhere),
          })
        }
        if (args.onConflictDoNothing) {
          query = query.onConflictDoNothing({
            target: args.onConflictDoNothing.target?.map((t) =>
              this.toColumn(t)
            ),
            where: this.extractFilters(args.onConflictDoNothing.where),
          })
        }
        return (
          await query.returning(getSelectedColumns(this.table, payload))
        )[0] as any
      },
    } as MutationOptions<any, any>)
  }

  public updateMutation<TInputI = UpdateArgs<TTable>>({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<UpdateArgs<TTable>, TInputI>
    middlewares?: Middleware<UpdateMutationReturningItems<TTable, TInputI>>[]
  } = {}): UpdateMutationReturningItems<TTable, TInputI> {
    input ??= silk(() => this.inputFactory.updateArgs() as GraphQLOutputType)

    return new MutationFactoryWithResolve(this.output.$list(), {
      ...options,
      input,
      resolve: async (args, payload) => {
        const query = this.db.update(this.table).set(args.set)
        if (args.where) {
          query.where(this.extractFilters(args.where))
        }
        return await query.returning(getSelectedColumns(this.table, payload))
      },
    } as MutationOptions<any, any>)
  }

  public deleteMutation<TInputI = DeleteArgs<TTable>>({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<DeleteArgs<TTable>, TInputI>
    middlewares?: Middleware<DeleteMutationReturningItems<TTable, TInputI>>[]
  } = {}): DeleteMutationReturningItems<TTable, TInputI> {
    input ??= silk(() => this.inputFactory.deleteArgs() as GraphQLOutputType)

    return new MutationFactoryWithResolve(this.output.$list(), {
      ...options,
      input,
      resolve: async (args, payload) => {
        const query = this.db.delete(this.table)
        if (args.where) {
          query.where(this.extractFilters(args.where))
        }
        return await query.returning(getSelectedColumns(this.table, payload))
      },
    } as MutationOptions<any, any>)
  }

  public resolver<TTableName extends string = TTable["_"]["name"]>(
    options: { name?: TTableName; middlewares?: Middleware[] } = {}
  ): ObjectChainResolver<
    GraphQLSilk<SelectiveTable<TTable>, SelectiveTable<TTable>>,
    DrizzleResolverReturningItems<TDatabase, TTable, TTableName>
  > {
    return super.resolver(options) as any
  }
}
