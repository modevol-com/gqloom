import {
  capitalize,
  FieldFactoryWithResolve,
  type FieldOptions,
  type GraphQLFieldOptions,
  type GraphQLSilk,
  getDeepResolvingFields,
  loom,
  type MayPromise,
  type Middleware,
  MutationFactoryWithResolve,
  type MutationOptions,
  type ObjectChainResolver,
  QueryFactoryWithResolve,
  type QueryOptions,
  type ResolverOptionsWithExtensions,
  type ResolverPayload,
  type ResolvingFields,
  silk,
  weaverContext,
} from "@gqloom/core"
import {
  type Cursor,
  type EntityManager,
  type EntityName,
  type EntityProperty,
  EntitySchema,
  type Reference,
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
import {
  getMetadata,
  getSelectedFields,
  getWeaverConfigMetadata,
} from "../helper"
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
  InferReferenceKeys,
  InsertManyMutation,
  InsertManyMutationArgs,
  InsertManyMutationOptions,
  InsertMutation,
  InsertMutationArgs,
  InsertMutationOptions,
  MikroQueriesResolver,
  MikroResolver,
  MikroResolverFactoryOptions,
  ReferenceField,
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
      | ((payload: ResolverPayload | undefined) => MayPromise<EntityManager>)
  ) {
    if (typeof optionsOrGetEntityManager === "function") {
      this.options = { getEntityManager: optionsOrGetEntityManager }
    } else {
      this.options = optionsOrGetEntityManager
    }

    this.inputFactory = new MikroInputFactory(entityName, this.options)

    this.flushMiddleware = async (next) => {
      const result = await next()
      const em = await this.em(next.payload)
      await em.flush()
      return result
    }
  }

  protected get meta() {
    return getMetadata(
      this.entityName,
      this.options?.metadata ?? getWeaverConfigMetadata()
    )
  }

  protected get metaName(): string {
    return this.meta.name ?? this.meta.className
  }

  protected em(payload: ResolverPayload | undefined) {
    return this.options.getEntityManager(payload)
  }

  protected getEntityMeta(entityName: EntityName<any>) {
    if (entityName instanceof EntitySchema) {
      return entityName.init().meta
    }
    const metadata = this.options?.metadata ?? getWeaverConfigMetadata()
    if (!metadata) throw new Error("Metadata not found")
    return metadata.get(entityName)
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
        resolve: async (
          parent: TEntity,
          args: CollectionFieldOptions<TEntity, TKey>,
          payload
        ) => {
          const em = await this.em(payload)
          const { where, ...rest } = args

          // Always scope the collection to the current parent entity.
          // For ONE_TO_MANY we can rely on mappedBy, for MANY_TO_MANY we
          // fall back to the property name or inverse side if available.
          const relationField =
            property.mappedBy ?? property.inversedBy ?? property.name

          const finalWhere = {
            ...(where ?? {}),
            [relationField]: parent,
          }

          return em.find(property.entity() as any, finalWhere, {
            fields: getSelectedFields(payload),
            ...rest,
          })
        },
      } as FieldOptions<any, any, any, any>
    )
  }

  public referenceField<TKey extends InferReferenceKeys<TEntity>>(
    key: TKey,
    options: {
      middlewares?: Middleware<ReferenceField<TEntity, TKey>>[]
    } & GraphQLFieldOptions = {}
  ): ReferenceField<TEntity, TKey> {
    const property = (this.meta.properties as any)[key] as EntityProperty
    if (property == null) throw new Error(`Property ${String(key)} not found`)
    if (
      property.kind !== ReferenceKind.ONE_TO_ONE &&
      property.kind !== ReferenceKind.MANY_TO_ONE
    )
      throw new Error(`Property ${String(key)} is not a reference field`)
    const targetEntity = this.getEntityMeta(property.entity())
    return new FieldFactoryWithResolve(
      silk.nullable(silk(MikroWeaver.getGraphQLType(targetEntity))),
      {
        ...options,
        resolve: (parent, _args, payload) => {
          const prop = (parent as any)[key] as Reference<any> | null | undefined
          if (prop == null) return null
          return prop.load({
            dataloader: true,
            fields: getSelectedFields(payload),
          })
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
      resolve: async (args: CountQueryOptions<TEntity>, payload) => {
        return (await this.em(payload)).count(this.entityName, args.where, args)
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
        resolve: async (args: FindQueryOptions<TEntity>, payload) => {
          return (await this.em(payload)).find(
            this.entityName,
            args.where ?? {},
            {
              fields: getSelectedFields(payload),
              ...args,
            }
          )
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
      resolve: async (args: FindQueryOptions<TEntity>, payload) => {
        const [items, totalCount] = await (await this.em(payload)).findAndCount(
          this.entityName,
          args.where ?? {},
          {
            fields: getSelectedFields(payload),
            ...args,
          }
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
        const deepFields = payload
          ? getDeepResolvingFields(payload)
          : new Map<string, ResolvingFields>()
        const includeCount = deepFields
          .get("")
          ?.selectedFields.has("totalCount")
        const fields = Array.from(
          deepFields.get("items")?.selectedFields ?? ["*"]
        )
        return (await this.em(payload)).findByCursor(this.entityName, {
          where,
          fields,
          includeCount,
          ...args,
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
      resolve: async (args: FindOneQueryOptions<TEntity>, payload) => {
        const em = await this.em(payload)
        return em.findOne(this.entityName, args.where, {
          fields: getSelectedFields(payload),
          ...args,
        })
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
      resolve: async (args: FindOneQueryOptions<TEntity>, payload) => {
        const em = await this.em(payload)
        return em.findOneOrFail(this.entityName, args.where, {
          fields: getSelectedFields(payload),
          ...args,
        })
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
      resolve: async (args: CreateMutationOptions<TEntity>, payload) => {
        const em = await this.em(payload)
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
      resolve: async (args: InsertMutationOptions<TEntity>, payload) => {
        const em = await this.em(payload)
        const key = await em.insert(this.entityName, args.data, args)
        return em.findOneOrFail(this.entityName, key as any, {
          fields: getSelectedFields(payload),
          ...args,
        })
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
      resolve: async (args: InsertManyMutationOptions<TEntity>, payload) => {
        const em = await this.em(payload)
        const keys = await em.insertMany(
          this.entityName as any,
          args.data,
          args
        )
        return em.find(this.entityName, keys as any, {
          fields: getSelectedFields(payload),
          ...args,
        })
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
        resolve: async (args: DeleteMutationOptions<TEntity>, payload) => {
          const em = await this.em(payload)
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
        resolve: async (
          args: UpdateMutationOptions<TEntity>,
          payload
        ): Promise<number> => {
          const em = await this.em(payload)
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
        resolve: async (args: UpsertMutationOptions<TEntity>, payload) => {
          const em = await this.em(payload)
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
        resolve: async (args: UpsertManyMutationOptions<TEntity>, payload) => {
          const em = await this.em(payload)
          return em.upsertMany(this.entityName, args.data, args)
        },
      } as MutationOptions<any, typeof input>
    )
  }

  public queriesResolver(
    options?: ResolverOptionsWithExtensions
  ): ObjectChainResolver<
    GraphQLSilk<TEntity, TEntity>,
    MikroQueriesResolver<TEntity, string>
  >
  public queriesResolver<TName extends string>(
    name: TName,
    options?: ResolverOptionsWithExtensions
  ): ObjectChainResolver<
    GraphQLSilk<TEntity, TEntity>,
    MikroQueriesResolver<TEntity, TName>
  >
  public queriesResolver(
    optionsOrName?: ResolverOptionsWithExtensions | string,
    options?: ResolverOptionsWithExtensions
  ): ObjectChainResolver<
    GraphQLSilk<TEntity, TEntity>,
    MikroQueriesResolver<TEntity, string>
  > {
    const name =
      typeof optionsOrName === "string" ? optionsOrName : this.metaName
    options ??= typeof optionsOrName === "object" ? optionsOrName : undefined
    const output = silk(MikroWeaver.getGraphQLType(this.meta))
    return loom.resolver.of(
      output,
      {
        [`count${capitalize(name)}`]: this.countQuery(),
        [`find${capitalize(name)}`]: this.findQuery(),
        [`find${capitalize(name)}ByCursor`]: this.findByCursorQuery(),
        [`findOne${capitalize(name)}`]: this.findOneQuery(),
        [`findOne${capitalize(name)}OrFail`]: this.findOneOrFailQuery(),
        ...Object.fromEntries(
          Object.entries(this.meta.properties)
            .filter(([_, property]) => {
              const prop = property as EntityProperty
              return (
                prop.kind === ReferenceKind.ONE_TO_ONE ||
                prop.kind === ReferenceKind.MANY_TO_ONE
              )
            })
            .map(([key]) => [key, this.referenceField(key as any) as any])
        ),
        ...Object.fromEntries(
          Object.entries(this.meta.properties)
            .filter(([_, property]) => {
              const prop = property as EntityProperty
              return (
                prop.kind === ReferenceKind.ONE_TO_MANY ||
                prop.kind === ReferenceKind.MANY_TO_MANY
              )
            })
            .map(([key]) => [key, this.collectionField(key as any) as any])
        ),
      },
      options as ResolverOptionsWithExtensions<any> | undefined
    ) as any
  }

  public resolver(
    options?: ResolverOptionsWithExtensions
  ): ObjectChainResolver<
    GraphQLSilk<TEntity, TEntity>,
    MikroResolver<TEntity, string>
  >
  public resolver<TName extends string>(
    name: TName,
    options?: ResolverOptionsWithExtensions
  ): ObjectChainResolver<
    GraphQLSilk<TEntity, TEntity>,
    MikroResolver<TEntity, TName>
  >
  public resolver(
    optionsOrName?: ResolverOptionsWithExtensions | string,
    options?: ResolverOptionsWithExtensions
  ): ObjectChainResolver<
    GraphQLSilk<TEntity, TEntity>,
    MikroResolver<TEntity, string>
  > {
    const name =
      typeof optionsOrName === "string" ? optionsOrName : this.metaName
    options ??= typeof optionsOrName === "object" ? optionsOrName : undefined
    const output = silk(MikroWeaver.getGraphQLType(this.meta))
    return loom.resolver.of(
      output,
      {
        [`count${capitalize(name)}`]: this.countQuery(),
        [`find${capitalize(name)}`]: this.findQuery(),
        [`find${capitalize(name)}ByCursor`]: this.findByCursorQuery(),
        [`findOne${capitalize(name)}`]: this.findOneQuery(),
        [`findOne${capitalize(name)}OrFail`]: this.findOneOrFailQuery(),
        [`create${capitalize(name)}`]: this.createMutation(),
        [`insert${capitalize(name)}`]: this.insertMutation(),
        [`insertMany${capitalize(name)}`]: this.insertManyMutation(),
        [`delete${capitalize(name)}`]: this.deleteMutation(),
        [`update${capitalize(name)}`]: this.updateMutation(),
        [`upsert${capitalize(name)}`]: this.upsertMutation(),
        [`upsertMany${capitalize(name)}`]: this.upsertManyMutation(),
        ...Object.fromEntries(
          Object.entries(this.meta.properties)
            .filter(([_, property]) => {
              const prop = property as EntityProperty
              return (
                prop.kind === ReferenceKind.ONE_TO_ONE ||
                prop.kind === ReferenceKind.MANY_TO_ONE
              )
            })
            .map(([key]) => [key, this.referenceField(key as any) as any])
        ),
        ...Object.fromEntries(
          Object.entries(this.meta.properties)
            .filter(([_, property]) => {
              const prop = property as EntityProperty
              return (
                prop.kind === ReferenceKind.ONE_TO_MANY ||
                prop.kind === ReferenceKind.MANY_TO_MANY
              )
            })
            .map(([key]) => [key, this.collectionField(key as any) as any])
        ),
      },
      options as ResolverOptionsWithExtensions<any> | undefined
    ) as any
  }

  protected middlewaresWithFlush(middlewares?: Middleware[]): Middleware[] {
    return [...(middlewares ?? []), this.flushMiddleware]
  }
}
