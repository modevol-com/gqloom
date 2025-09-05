import {
  FieldFactoryWithResolve,
  type FieldOptions,
  type GraphQLFieldOptions,
  type GraphQLSilk,
  type MayPromise,
  type Middleware,
  MutationFactoryWithResolve,
  type MutationOptions,
  QueryFactoryWithResolve,
  type QueryOptions,
  getResolvingFields,
  silk,
  weaverContext,
} from "@gqloom/core"
import {
  type Collection,
  type Cursor,
  type EntityManager,
  type EntityName,
  type EntityProperty,
  EntitySchema,
  ReferenceKind,
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
  CollectionField,
  CollectionFieldArgs,
  CollectionFieldOptions,
  CountQuery,
  CountQueryArgs,
  CountQueryOptions,
  CreateMutation,
  CreateMutationArgs,
  CreateMutationOptions,
  DeleteMutation,
  DeleteMutationArgs,
  DeleteMutationOptions,
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
  InferCollectionKeys,
  InferRelationKeys,
  InsertManyMutation,
  InsertManyMutationArgs,
  InsertManyMutationOptions,
  InsertMutation,
  InsertMutationArgs,
  InsertMutationOptions,
  MikroResolverFactoryOptions,
  RelationField,
  UpdateMutation,
  UpdateMutationArgs,
  UpdateMutationOptions,
  UpsertManyMutation,
  UpsertManyMutationArgs,
  UpsertManyMutationOptions,
  UpsertMutation,
  UpsertMutationArgs,
  UpsertMutationOptions,
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

  protected getEntityMeta(entityName: EntityName<any>) {
    if (entityName instanceof EntitySchema) {
      return entityName.init().meta
    }
    if (!this.options.metadata) throw new Error("Metadata not found")
    return this.options.metadata.get(entityName)
  }

  public relationField<TKey extends InferRelationKeys<TEntity>>(
    key: TKey,
    options: {
      middlewares?: Middleware<RelationField<TEntity, TKey>>[]
    } & GraphQLFieldOptions = {}
  ): RelationField<TEntity, TKey> {
    const property = (this.meta.properties as any)[key] as EntityProperty
    if (property == null) throw new Error(`Property ${String(key)} not found`)

    if (
      property.kind === ReferenceKind.ONE_TO_MANY ||
      property.kind === ReferenceKind.MANY_TO_MANY
    ) {
      return this.collectionField(key as any, options as any) as any
    }

    if (
      property.kind === ReferenceKind.ONE_TO_ONE ||
      property.kind === ReferenceKind.MANY_TO_ONE
    ) {
      //TODO: return this.referenceField(key as any, options as any) as any
    }

    if (!property.ref)
      throw new Error(`Property ${String(key)} is not a reference field`)

    //TODO: return this.scalarReferenceField(key as any, options as any) as any
    throw new Error("TODO")
  }

  public collectionField<TKey extends InferCollectionKeys<TEntity>>(
    key: TKey,
    options?: {
      middlewares?: Middleware<
        CollectionField<TEntity, TKey, CollectionFieldArgs<TEntity, TKey>>
      >[]
    } & GraphQLFieldOptions
  ): CollectionField<TEntity, TKey, CollectionFieldArgs<TEntity, TKey>>
  public collectionField<TKey extends InferCollectionKeys<TEntity>, TInputI>(
    key: TKey,
    options: {
      input: GraphQLSilk<CollectionFieldArgs<TEntity, TKey>, TInputI>
      middlewares?: Middleware<CollectionField<TEntity, TKey, TInputI>>[]
    } & GraphQLFieldOptions
  ): CollectionField<TEntity, TKey, TInputI>
  public collectionField<
    TKey extends InferCollectionKeys<TEntity>,
    TInputI = CollectionFieldArgs<TEntity, TKey>,
  >(
    key: TKey,
    {
      input,
      ...options
    }: {
      input?: GraphQLSilk<CollectionFieldArgs<TEntity, TKey>, TInputI>
      middlewares?: Middleware<CollectionField<TEntity, TKey, TInputI>>[]
    } & GraphQLFieldOptions = {}
  ): CollectionField<TEntity, TKey, TInputI> {
    const property = (this.meta.properties as any)[key] as EntityProperty
    if (property == null) throw new Error(`Property ${String(key)} not found`)
    if (
      property.kind !== ReferenceKind.ONE_TO_MANY &&
      property.kind !== ReferenceKind.MANY_TO_MANY
    )
      throw new Error(`Property ${String(key)} is not a collection field`)
    const targetEntity = this.getEntityMeta(property.entity())
    input ??= this.inputFactory.collectionFieldArgsSilk(
      targetEntity
    ) as GraphQLSilk<CollectionFieldArgs<TEntity, TKey>, TInputI>
    return new FieldFactoryWithResolve(
      silk(
        new GraphQLNonNull(
          new GraphQLList(MikroWeaver.getGraphQLType(targetEntity))
        )
      ),
      {
        input,
        ...options,
        resolve: (
          parent: TEntity,
          args: CollectionFieldOptions<TEntity, TKey>
        ) => {
          const prop = (parent as any)[key] as Collection<any, any>
          return prop.loadItems({ refresh: true, ...args })
        },
      } as FieldOptions<any, any, any, any>
    )
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
      resolve: async (args: CreateMutationOptions<any>) => {
        const em = await this.em()
        const instance = em.create(this.entityName, args.data)
        em.persist(instance)
        return instance
      },
    })
  }

  public insertMutation<TInputI = InsertMutationArgs<TEntity>>({
    input,
    middlewares,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<InsertMutationOptions<TEntity>, TInputI>
    middlewares?: Middleware<InsertMutation<TEntity, TInputI>>[]
  } = {}): InsertMutation<TEntity, TInputI> {
    input ??= this.inputFactory.insertArgsSilk() as GraphQLSilk<
      InsertMutationOptions<TEntity>,
      TInputI
    >
    const output = MikroWeaver.getGraphQLType(this.meta)
    return new MutationFactoryWithResolve(silk(output), {
      input,
      middlewares: this.middlewaresWithFlush(middlewares),
      ...options,
      resolve: async (args: InsertMutationOptions<any>) => {
        const em = await this.em()
        const key = await em.insert(this.entityName, args.data, args)
        return em.findOneOrFail(this.entityName, key)
      },
    } as MutationOptions<any, any>)
  }

  public insertManyMutation<TInputI = InsertManyMutationArgs<TEntity>>({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<InsertManyMutationOptions<TEntity>, TInputI>
    middlewares?: Middleware<InsertManyMutation<TEntity, TInputI>>[]
  } = {}): InsertManyMutation<TEntity, TInputI> {
    input ??= this.inputFactory.insertManyArgsSilk() as GraphQLSilk<
      InsertManyMutationOptions<TEntity>,
      TInputI
    >
    const entityType = MikroWeaver.getGraphQLType(this.meta)
    const output = new GraphQLNonNull(new GraphQLList(entityType))
    return new MutationFactoryWithResolve(silk(output), {
      input,
      ...options,
      resolve: async (args: InsertManyMutationOptions<any>) => {
        const em = await this.em()
        const keys = await em.insertMany(this.entityName, args.data, args)
        return em.find(this.entityName, keys as any)
      },
    } as MutationOptions<any, any>)
  }

  public deleteMutation<TInputI = DeleteMutationArgs<TEntity>>({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<DeleteMutationOptions<TEntity>, TInputI>
    middlewares?: Middleware<DeleteMutation<TEntity, TInputI>>[]
  } = {}): DeleteMutation<TEntity, TInputI> {
    input ??= this.inputFactory.deleteArgsSilk() as GraphQLSilk<
      DeleteMutationOptions<TEntity>,
      TInputI
    >
    return new MutationFactoryWithResolve(
      silk(new GraphQLNonNull(GraphQLInt)),
      {
        input,
        ...options,
        resolve: async (args: DeleteMutationOptions<TEntity>) => {
          const em = await this.em()
          return em.nativeDelete(this.entityName, args.where, args)
        },
      } as MutationOptions<GraphQLSilk<number, number>, typeof input>
    )
  }

  public updateMutation<TInputI = UpdateMutationArgs<TEntity>>({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<UpdateMutationOptions<TEntity>, TInputI>
    middlewares?: Middleware<UpdateMutation<TEntity, TInputI>>[]
  } = {}): UpdateMutation<TEntity, TInputI> {
    input ??= this.inputFactory.updateArgsSilk() as GraphQLSilk<
      UpdateMutationOptions<TEntity>,
      TInputI
    >

    return new MutationFactoryWithResolve(
      silk(new GraphQLNonNull(GraphQLInt)),
      {
        input,
        ...options,
        resolve: async (args): Promise<number> => {
          const em = await this.em()
          return em.nativeUpdate(this.entityName, args.where, args.data, args)
        },
      } as MutationOptions<GraphQLSilk<number, number>, typeof input>
    )
  }

  public upsertMutation<TInputI = UpsertMutationArgs<TEntity>>({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<UpsertMutationOptions<TEntity>, TInputI>
    middlewares?: Middleware<UpsertMutation<TEntity, TInputI>>[]
  } = {}): UpsertMutation<TEntity, TInputI> {
    input ??= this.inputFactory.upsertArgsSilk() as GraphQLSilk<
      UpsertMutationOptions<TEntity>,
      TInputI
    >
    return new MutationFactoryWithResolve(
      silk(MikroWeaver.getGraphQLType(this.meta)),
      {
        input,
        ...options,
        resolve: async (args: UpsertMutationOptions<TEntity>) => {
          const em = await this.em()
          return em.upsert(this.entityName, args.data, args)
        },
      } as MutationOptions<any, typeof input>
    )
  }

  public upsertManyMutation<TInputI = UpsertManyMutationArgs<TEntity>>({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<UpsertManyMutationOptions<TEntity>, TInputI>
    middlewares?: Middleware<UpsertManyMutation<TEntity, TInputI>>[]
  } = {}): UpsertManyMutation<TEntity, TInputI> {
    input ??= this.inputFactory.upsertManyArgsSilk() as GraphQLSilk<
      UpsertManyMutationOptions<TEntity>,
      TInputI
    >
    return new MutationFactoryWithResolve(
      silk(
        new GraphQLNonNull(
          new GraphQLList(MikroWeaver.getGraphQLType(this.meta))
        )
      ),
      {
        input,
        ...options,
        resolve: async (args: UpsertManyMutationOptions<TEntity>) => {
          const em = await this.em()
          return em.upsertMany(this.entityName, args.data, args)
        },
      } as MutationOptions<any, typeof input>
    )
  }

  protected middlewaresWithFlush(middlewares?: Middleware[]): Middleware[] {
    return [...(middlewares ?? []), this.flushMiddleware]
  }
}
