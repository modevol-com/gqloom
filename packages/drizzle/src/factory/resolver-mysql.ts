import {
  type GraphQLFieldOptions,
  type GraphQLSilk,
  type Middleware,
  MutationFactoryWithResolve,
  type MutationOptions,
  type ObjectChainResolver,
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
  DeleteOptions,
  DrizzleResolverReturningSuccess,
  InsertArrayMutationReturningSuccess,
  InsertArrayOptions,
  InsertSingleMutationReturningSuccess,
  InsertSingleOptions,
  UpdateMutationReturningSuccess,
  UpdateOptions,
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
    input?: GraphQLSilk<InsertArrayOptions<TTable>, TInputI>
    middlewares?: Middleware<
      InsertArrayMutationReturningSuccess<TTable, TInputI>
    >[]
  } = {}): InsertArrayMutationReturningSuccess<TTable, TInputI> {
    input ??= silk(
      () => this.inputFactory.insertArrayArgs() as GraphQLOutputType,
      this.argsTransformer.toInsertArrayOptions
    ) as any

    return new MutationFactoryWithResolve(
      DrizzleMySQLResolverFactory.mutationResult,
      {
        ...options,
        input,
        resolve: async (args: InsertArrayOptions<TTable>) => {
          await this.db.insert(this.table).values(args.values)
          return { isSuccess: true }
        },
      } as MutationOptions<any, any>
    )
  }

  public insertSingleMutation<TInputI = InsertSingleArgs<TTable>>({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<InsertSingleOptions<TTable>, TInputI>
    middlewares?: Middleware<
      InsertSingleMutationReturningSuccess<TTable, TInputI>
    >[]
  } = {}): InsertSingleMutationReturningSuccess<TTable, TInputI> {
    input ??= silk(
      () => this.inputFactory.insertSingleArgs() as GraphQLOutputType,
      this.argsTransformer.toInsertSingleOptions
    ) as any

    return new MutationFactoryWithResolve(
      DrizzleMySQLResolverFactory.mutationResult,
      {
        ...options,
        input,
        resolve: async (args: InsertSingleOptions<TTable>) => {
          await this.db.insert(this.table).values(args.value)
          return { isSuccess: true }
        },
      } as MutationOptions<any, any>
    )
  }

  public updateMutation<TInputI = UpdateArgs<TTable>>({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<UpdateOptions<TTable>, TInputI>
    middlewares?: Middleware<UpdateMutationReturningSuccess<TTable, TInputI>>[]
  } = {}): UpdateMutationReturningSuccess<TTable, TInputI> {
    input ??= silk(
      () => this.inputFactory.updateArgs() as GraphQLOutputType,
      this.argsTransformer.toUpdateOptions
    ) as any

    return new MutationFactoryWithResolve(
      DrizzleMySQLResolverFactory.mutationResult,
      {
        ...options,
        input,
        resolve: async (args: UpdateOptions<TTable>) => {
          let query: any = this.db.update(this.table).set(args.set)
          if (args.where) {
            query = query.where(args.where)
          }
          await query
          return { isSuccess: true }
        },
      } as MutationOptions<any, any>
    )
  }

  public deleteMutation<TInputI = DeleteArgs<TTable>>({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<DeleteOptions, TInputI>
    middlewares?: Middleware<DeleteMutationReturningSuccess<TTable, TInputI>>[]
  } = {}): DeleteMutationReturningSuccess<TTable, TInputI> {
    input ??= silk(
      () => this.inputFactory.deleteArgs() as GraphQLOutputType,
      this.argsTransformer.toDeleteOptions
    ) as any

    return new MutationFactoryWithResolve(
      DrizzleMySQLResolverFactory.mutationResult,
      {
        ...options,
        input,
        resolve: async (args: DeleteOptions) => {
          let query: any = this.db.delete(this.table)
          if (args.where) {
            query = query.where(args.where)
          }
          await query
          return { isSuccess: true }
        },
      } as MutationOptions<any, any>
    )
  }

  public resolver<TTableName extends string = TTable["_"]["name"]>(
    options: {
      name?: TTableName
      middlewares?: Middleware[]
    } = {}
  ): ObjectChainResolver<
    GraphQLSilk<InferSelectModel<TTable>, InferSelectModel<TTable>>,
    DrizzleResolverReturningSuccess<TDatabase, TTable, TTableName>
  > {
    return super.resolver(options) as any
  }
}
