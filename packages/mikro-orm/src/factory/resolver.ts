import {
  type GraphQLFieldOptions,
  type GraphQLSilk,
  type MayPromise,
  type Middleware,
  QueryFactoryWithResolve,
  type QueryOptions,
  silk,
} from "@gqloom/core"
import type { EntityManager, EntityName } from "@mikro-orm/core"
import { GraphQLInt, GraphQLNonNull } from "graphql"
import { MikroInputFactory } from "./input"
import { MikroArgsTransformer } from "./transformer"
import type {
  CountQuery,
  CountQueryArgs,
  CountQueryOptions,
  MikroResolverFactoryOptions,
} from "./type"

export class MikroResolverFactory<TEntity extends object> {
  public readonly options: MikroResolverFactoryOptions<TEntity>
  protected flushMiddleware: Middleware
  protected inputFactory: MikroInputFactory<TEntity>
  protected transformer: MikroArgsTransformer<TEntity>

  public constructor(
    protected readonly entityName: EntityName<TEntity>,
    optionsOrGetEntityManager:
      | MikroResolverFactoryOptions<TEntity>
      | (() => MayPromise<EntityManager>)
  ) {
    if (typeof optionsOrGetEntityManager === "function") {
      this.options = { getEntityManager: optionsOrGetEntityManager }
    } else {
      this.options = optionsOrGetEntityManager
    }

    this.inputFactory = new MikroInputFactory(entityName, this.options)
    this.transformer = new MikroArgsTransformer(entityName)

    this.flushMiddleware = async (next) => {
      const result = await next()
      const em = await this.em()
      await em.flush()
      return result
    }
  }

  protected em() {
    return this.options.getEntityManager()
  }

  public countQuery<TInputI = CountQueryArgs<TEntity>>({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<CountQueryOptions<TEntity>, TInputI>
    middlewares?: Middleware<CountQuery<TEntity, TInputI>>[]
  } = {}): CountQuery<TEntity, TInputI> {
    input ??= silk<CountQueryOptions<TEntity>, CountQueryArgs<TEntity>>(
      () => this.inputFactory.countArgs(),
      this.transformer.toCountOptions
    ) as GraphQLSilk<CountQueryOptions<TEntity>, TInputI>

    return new QueryFactoryWithResolve(silk(new GraphQLNonNull(GraphQLInt)), {
      input,
      ...options,
      resolve: async (args: CountQueryOptions<TEntity>) => {
        return (await this.em()).count(this.entityName, args.where, args)
      },
    } as QueryOptions<any, any>)
  }

  public findQuery() {
    // TODO
  }

  public findAndCountQuery() {
    // TODO
  }

  public findByCursorQuery() {
    // TODO
  }

  public findOneQuery() {
    // TODO
  }

  public findOneOrFailQuery() {
    // TODO
  }

  public assignMutation() {
    // TODO
  }

  public createMutation() {
    // TODO
  }

  public insertMutation() {
    // TODO
  }

  public insertManyMutation() {
    // TODO
  }

  public nativeDeleteMutation() {
    // TODO
  }

  public nativeUpdateMutation() {
    // TODO
  }

  public upsertMutation() {
    // TODO
  }

  public upsertManyMutation() {
    // TODO
  }
}
