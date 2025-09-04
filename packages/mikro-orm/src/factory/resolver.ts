import {
  type GraphQLFieldOptions,
  type GraphQLSilk,
  type MayPromise,
  type Middleware,
  QueryFactoryWithResolve,
  type QueryOptions,
  silk,
  weaverContext,
} from "@gqloom/core"
import {
  type EntityManager,
  type EntityName,
  EntitySchema,
} from "@mikro-orm/core"
import {
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  type GraphQLOutputType,
} from "graphql"
import { MikroWeaver } from ".."
import { MikroInputFactory } from "./input"
import type {
  CountQuery,
  CountQueryArgs,
  CountQueryOptions,
  FindAndCountQuery,
  FindQuery,
  FindQueryArgs,
  FindQueryOptions,
  MikroResolverFactoryOptions,
} from "./type"

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
      const em = await this.em()
      await em.flush()
      return result
    }
  }

  protected get meta() {
    if (this.entityName instanceof EntitySchema) {
      return this.entityName.init().meta
    }
    if (!this.options.metadata) throw new Error("Metadata not found")
    return this.options.metadata.get(this.entityName)
  }

  protected get metaName(): string {
    return this.meta.name ?? this.meta.className
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
    input ??= this.inputFactory.countArgsSilk() as GraphQLSilk<
      CountQueryOptions<TEntity>,
      TInputI
    >

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
    input ??= this.inputFactory.findArgsSilk() as GraphQLSilk<
      FindQueryOptions<TEntity>,
      TInputI
    >

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

  public findAndCountQuery<TInputI = FindQueryArgs<TEntity>>({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<FindQueryOptions<TEntity>, TInputI>
    middlewares?: Middleware<FindAndCountQuery<TEntity, TInputI>>[]
  } = {}): FindAndCountQuery<TEntity, TInputI> {
    input ??= this.inputFactory.findArgsSilk() as GraphQLSilk<
      FindQueryOptions<TEntity>,
      TInputI
    >

    return new QueryFactoryWithResolve(silk(this.findAndCountQueryOutput()), {
      input,
      ...options,
      resolve: async (args: FindQueryOptions<TEntity>) => {
        const [items, count] = await (await this.em()).findAndCount(
          this.entityName,
          args.where ?? {},
          args
        )
        return { items, count }
      },
    } as QueryOptions<any, any>)
  }

  protected findAndCountQueryOutput(): GraphQLOutputType {
    const name = `${this.metaName}FindAndCount`
    const existing = weaverContext.getNamedType(name)
    if (existing != null) return existing
    const output = MikroWeaver.getGraphQLType(this.meta)
    return weaverContext.memoNamedType(
      new GraphQLNonNull(
        new GraphQLObjectType({
          name,
          fields: {
            count: { type: new GraphQLNonNull(GraphQLInt) },
            items: { type: new GraphQLNonNull(new GraphQLList(output)) },
          },
        })
      )
    )
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
