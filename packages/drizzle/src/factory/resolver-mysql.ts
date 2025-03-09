import {
  type ChainResolver,
  type GraphQLFieldOptions,
  type GraphQLSilk,
  type Middleware,
  loom,
  silk,
} from "@gqloom/core"
import type { InferSelectModel } from "drizzle-orm"
import type { MySqlDatabase, MySqlTable } from "drizzle-orm/mysql-core"
import type { GraphQLOutputType } from "graphql"
import {
  type DeleteArgs,
  DrizzleInputFactory,
  type InsertArrayArgs,
  type InsertSingleArgs,
  type MutationResult,
  type UpdateArgs,
} from "./input"
import { DrizzleResolverFactory } from "./resolver"
import type {
  DeleteMutationReturningSuccess,
  DrizzleResolverReturningSuccess,
  InsertArrayMutationReturningSuccess,
  InsertSingleMutationReturningSuccess,
  UpdateMutationReturningSuccess,
} from "./types"

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
    input ??= silk(
      () => this.inputFactory.insertArrayArgs() as GraphQLOutputType
    )

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
    input ??= silk(
      () => this.inputFactory.insertSingleArgs() as GraphQLOutputType
    )

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
    input ??= silk(() => this.inputFactory.updateArgs() as GraphQLOutputType)

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
    input ??= silk(() => this.inputFactory.deleteArgs() as GraphQLOutputType)

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
  ): ChainResolver<
    DrizzleResolverReturningSuccess<TDatabase, TTable, TTableName>,
    GraphQLSilk<InferSelectModel<TTable>, InferSelectModel<TTable>>
  > {
    return super.resolver(options) as any
  }
}
