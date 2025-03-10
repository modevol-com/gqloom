import {
  type ChainResolver,
  type GraphQLFieldOptions,
  type GraphQLSilk,
  type Middleware,
  type MutationOptions,
  silk,
} from "@gqloom/core"
import type { InferSelectModel } from "drizzle-orm"
import type { PgDatabase, PgTable } from "drizzle-orm/pg-core"
import type { GraphQLOutputType } from "graphql"
import { MutationFactoryWithResolve } from "./field"
import type {
  DeleteArgs,
  InsertArrayArgs,
  InsertSingleArgs,
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
    input ??= silk(
      () => this.inputFactory.insertArrayArgs() as GraphQLOutputType
    )

    return new MutationFactoryWithResolve(this.output.$list(), {
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
    } as MutationOptions<any, any>)
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
    input ??= silk(
      () => this.inputFactory.insertSingleArgs() as GraphQLOutputType
    )

    return new MutationFactoryWithResolve(this.output.$nullable(), {
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
      resolve: async (args) => {
        const query = this.db.update(this.table).set(args.set)
        if (args.where) {
          query.where(this.extractFilters(args.where))
        }
        return await query.returning()
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
      resolve: async (args) => {
        const query = this.db.delete(this.table)
        if (args.where) {
          query.where(this.extractFilters(args.where))
        }
        return await query.returning()
      },
    } as MutationOptions<any, any>)
  }

  public resolver<TTableName extends string = TTable["_"]["name"]>(
    options: {
      name?: TTableName
      middlewares?: Middleware[]
    } = {}
  ): ChainResolver<
    DrizzleResolverReturningItems<TDatabase, TTable, TTableName>,
    GraphQLSilk<InferSelectModel<TTable>, InferSelectModel<TTable>>
  > {
    return super.resolver(options) as any
  }
}
