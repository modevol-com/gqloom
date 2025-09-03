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
import type { CountArgs, CountQuery, MikroResolverFactoryOptions } from "./type"

export class MikroResolverFactory<TEntity extends object> {
  public readonly options: MikroResolverFactoryOptions<TEntity>
  protected flushMiddleware: Middleware
  protected inputFactory: MikroInputFactory<TEntity>

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
    this.flushMiddleware = async (next) => {
      const result = await next()
      const em = await this.getEm()
      await em.flush()
      return result
    }
  }

  protected getEm() {
    return this.options.getEntityManager()
  }

  public countQuery<TInputI = CountArgs<TEntity>>({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<CountArgs<TEntity>, TInputI>
    middlewares?: Middleware<CountQuery<TEntity, TInputI>>[]
  } = {}): CountQuery<TEntity, TInputI> {
    input ??= silk<CountArgs<TEntity>, CountArgs<TEntity>>(() =>
      this.inputFactory.countArgs()
    ) as GraphQLSilk<CountArgs<TEntity>, TInputI>

    return new QueryFactoryWithResolve(silk(new GraphQLNonNull(GraphQLInt)), {
      input,
      ...options,
      resolve: async (args: CountArgs<TEntity>) => {
        const em = await this.getEm()
        return em.count(this.entityName, args.where, args)
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
