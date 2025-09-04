import {
  type GraphQLFieldOptions,
  type GraphQLSilk,
  type MayPromise,
  type Middleware,
  QueryFactoryWithResolve,
  type QueryOptions,
  silk,
} from "@gqloom/core"
import {
  type EntityManager,
  type EntityName,
  EntitySchema,
} from "@mikro-orm/core"
import { GraphQLInt, GraphQLList, GraphQLNonNull } from "graphql"
import { MikroWeaver } from ".."
import { MikroInputFactory } from "./input"
import { MikroArgsTransformer } from "./transformer"
import type {
  CountQuery,
  CountQueryArgs,
  CountQueryOptions,
  FindQuery,
  FindQueryArgs,
  FindQueryOptions,
  MikroResolverFactoryOptions,
} from "./type"

export class MikroResolverFactory<TEntity extends object> {
  public readonly options: MikroResolverFactoryOptions<TEntity>
  protected flushMiddleware: Middleware
  protected inputFactory: MikroInputFactory<TEntity>
  protected transformer: MikroArgsTransformer<TEntity>

  protected get meta() {
    if (this.entityName instanceof EntitySchema) {
      return this.entityName.init().meta
    }
    if (!this.options.metadata) throw new Error("Metadata not found")
    return this.options.metadata.get(this.entityName)
  }

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

  public findQuery<TInputI = FindQueryArgs<TEntity>>({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<FindQueryOptions<TEntity>, TInputI>
    middlewares?: Middleware<FindQuery<TEntity, TInputI>>[]
  } = {}): FindQuery<TEntity, TInputI> {
    input ??= silk<FindQueryOptions<TEntity>, FindQueryArgs<TEntity>>(
      () => this.inputFactory.findArgs(),
      this.transformer.toFindOptions
    ) as GraphQLSilk<FindQueryOptions<TEntity>, TInputI>

    const output = MikroWeaver.getGraphQLType(this.meta)

    return new QueryFactoryWithResolve(
      silk(new GraphQLNonNull(new GraphQLList(output))),
      {
        input,
        ...options,
        resolve: async (args: FindQueryOptions<TEntity>) => {
          return (await this.em()).find(this.entityName, args.where ?? {}, args)
        },
      } as QueryOptions<any, any>
    )
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
