import {
  type GraphQLFieldOptions,
  type GraphQLSilk,
  type MayPromise,
  type Middleware,
  MutationFactoryWithResolve,
  QueryFactoryWithResolve,
  type QueryOptions,
  getResolvingFields,
  silk,
  weaverContext,
} from "@gqloom/core"
import {
  type Cursor,
  type EntityManager,
  type EntityName,
  EntitySchema,
} from "@mikro-orm/core"
import {
  GraphQLBoolean,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  type GraphQLOutputType,
  GraphQLString,
} from "graphql"
import { MikroWeaver } from ".."
import { MikroInputFactory } from "./input"
import type {
  CountQuery,
  CountQueryArgs,
  CountQueryOptions,
  CreateMutation,
  CreateMutationArgs,
  CreateMutationOptions,
  FindAndCountQuery,
  FindByCursorQuery,
  FindByCursorQueryArgs,
  FindByCursorQueryOptions,
  FindOneOrFailQuery,
  FindOneQuery,
  FindOneQueryArgs,
  FindOneQueryOptions,
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
        const [items, totalCount] = await (await this.em()).findAndCount(
          this.entityName,
          args.where ?? {},
          args
        )
        return { items, totalCount }
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
            totalCount: { type: new GraphQLNonNull(GraphQLInt) },
            items: { type: new GraphQLNonNull(new GraphQLList(output)) },
          },
        })
      )
    )
  }

  public findByCursorQuery<TInputI = FindByCursorQueryArgs<TEntity>>({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<FindByCursorQueryOptions<TEntity>, TInputI>
    middlewares?: Middleware<FindByCursorQuery<TEntity, TInputI>>[]
  } = {}): FindByCursorQuery<TEntity, TInputI> {
    input ??= this.inputFactory.findByCursorArgsSilk() as GraphQLSilk<
      FindByCursorQueryOptions<TEntity>,
      TInputI
    >

    return new QueryFactoryWithResolve(silk(this.cursorOutput()), {
      input,
      ...options,
      resolve: async (
        { where, ...args }: FindByCursorQueryOptions<TEntity>,
        payload
      ) => {
        const includeCount = (() => {
          if (!payload) return true
          return getResolvingFields(payload).selectedFields.has("totalCount")
        })()
        return (await this.em()).findByCursor(this.entityName, where ?? {}, {
          ...args,
          includeCount,
        })
      },
    } as QueryOptions<any, any>)
  }

  protected cursorOutput(): GraphQLOutputType {
    const name = `${this.metaName}Cursor`
    const existing = weaverContext.getNamedType(name)
    if (existing != null) return existing
    const output = MikroWeaver.getGraphQLType(this.meta)
    return weaverContext.memoNamedType(
      new GraphQLObjectType<Cursor<TEntity>>({
        name,
        fields: {
          items: { type: new GraphQLNonNull(new GraphQLList(output)) },
          totalCount: { type: new GraphQLNonNull(GraphQLInt) },
          hasPrevPage: { type: new GraphQLNonNull(GraphQLBoolean) },
          hasNextPage: { type: new GraphQLNonNull(GraphQLBoolean) },
          startCursor: { type: GraphQLString },
          endCursor: { type: GraphQLString },
          length: { type: GraphQLInt },
        },
      })
    )
  }

  public findOneQuery<TInputI = FindOneQueryArgs<TEntity>>({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<FindOneQueryOptions<TEntity>, TInputI>
    middlewares?: Middleware<FindOneQuery<TEntity, TInputI>>[]
  } = {}): FindOneQuery<TEntity, TInputI> {
    input ??= this.inputFactory.findOneArgsSilk() as GraphQLSilk<
      FindOneQueryOptions<TEntity>,
      TInputI
    >
    const output = MikroWeaver.getGraphQLType(this.meta)
    return new QueryFactoryWithResolve(silk.nullable(silk(output)), {
      input,
      ...options,
      resolve: async (args: FindOneQueryOptions<TEntity>) => {
        const em = await this.em()
        return em.findOne(this.entityName, args.where, args)
      },
    } as QueryOptions<any, any>)
  }

  public findOneOrFailQuery<TInputI = FindOneQueryArgs<TEntity>>({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<FindOneQueryOptions<TEntity>, TInputI>
    middlewares?: Middleware<FindOneOrFailQuery<TEntity, TInputI>>[]
  } = {}): FindOneOrFailQuery<TEntity, TInputI> {
    input ??= this.inputFactory.findOneArgsSilk() as GraphQLSilk<
      FindOneQueryOptions<TEntity>,
      TInputI
    >
    const output = MikroWeaver.getGraphQLType(this.meta)
    return new QueryFactoryWithResolve(silk.nonNull(silk(output)), {
      input,
      ...options,
      resolve: async (args: FindOneQueryOptions<TEntity>) => {
        const em = await this.em()
        return em.findOneOrFail(this.entityName, args.where, args)
      },
    } as QueryOptions<any, any>)
  }

  public assignMutation() {
    // TODO
  }

  public createMutation<TInputI = CreateMutationArgs<TEntity>>({
    input,
    middlewares,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<CreateMutationOptions<TEntity>, TInputI>
    middlewares?: Middleware<CreateMutation<TEntity, TInputI>>[]
  } = {}): CreateMutation<TEntity, TInputI> {
    input ??= this.inputFactory.createArgsSilk() as GraphQLSilk<
      CreateMutationOptions<TEntity>,
      TInputI
    >
    const output = MikroWeaver.getGraphQLType(this.meta)
    return new MutationFactoryWithResolve(silk(output), {
      input,
      middlewares: this.middlewaresWithFlush(middlewares),
      ...options,
      resolve: async (args) => {
        const em = await this.em()
        const instance = em.create(this.entityName, args.data)
        em.persist(instance)
        return instance
      },
    })
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

  protected middlewaresWithFlush(middlewares?: Middleware[]): Middleware[] {
    return [...(middlewares ?? []), this.flushMiddleware]
  }
}
