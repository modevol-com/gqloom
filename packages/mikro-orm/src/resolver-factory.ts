import {
  type GraphQLFieldOptions,
  type GraphQLSilk,
  type ListSilk,
  type Loom,
  type MayPromise,
  type Middleware,
  type MutationOptions,
  type QueryOptions,
  type StandardSchemaV1,
  getFieldOptions,
  loom,
  mapValue,
  silk,
  weaverContext,
} from "@gqloom/core"
import {
  type EntityManager,
  type EntitySchema,
  type FindAllOptions,
  type PrimaryProperty,
  QueryOrder,
  type RequiredEntityData,
  Utils,
} from "@mikro-orm/core"
import {
  GraphQLEnumType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  type GraphQLOutputType,
  GraphQLScalarType,
  GraphQLString,
} from "graphql"
import { type GraphQLFieldConfig, GraphQLInt } from "graphql"
import { MikroWeaver } from "."
import type { InferEntity } from "./types"

interface MikroResolverFactoryOptions {
  getEntityManager: () => MayPromise<EntityManager>
}

export class MikroResolverFactory<
  TSchema extends EntitySchema<any, any> & GraphQLSilk,
> {
  public readonly options: MikroResolverFactoryOptions
  protected flushMiddleware: Middleware
  protected inputFactory: MikroInputFactory<TSchema>
  public constructor(
    protected readonly entity: TSchema,
    optionsOrGetEntityManager:
      | MikroResolverFactoryOptions
      | MikroResolverFactoryOptions["getEntityManager"]
  ) {
    if (typeof optionsOrGetEntityManager === "function") {
      this.options = { getEntityManager: optionsOrGetEntityManager }
    } else {
      this.options = optionsOrGetEntityManager
    }

    entity.init()

    this.inputFactory = new MikroInputFactory(entity)
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

  /**
   * Create a `create` mutation for the given entity.
   */
  public createMutation<
    TInputI = { data: RequiredEntityData<InferEntity<TSchema>> },
  >({
    input = this.inputFactory.createInput() as unknown as GraphQLSilk<
      RequiredEntityData<InferEntity<TSchema>>,
      TInputI
    >,
    ...options
  }: {
    input?: GraphQLSilk<RequiredEntityData<InferEntity<TSchema>>, TInputI>
    middlewares?: Middleware<
      Loom.Mutation<
        TSchema,
        GraphQLSilk<RequiredEntityData<InferEntity<TSchema>>, TInputI>
      >
    >[]
  } & GraphQLFieldOptions = {}): Loom.Mutation<
    TSchema,
    GraphQLSilk<RequiredEntityData<InferEntity<TSchema>>, TInputI>
  > {
    const entity = this.entity

    const middlewares = this.middlewaresWithFlush(options)

    return loom.mutation(entity, {
      ...getFieldOptions(options),
      input,
      middlewares,
      resolve: async (data) => {
        const em = await this.getEm()
        const instance = em.create(entity, data)
        em.persist(instance)
        return instance
      },
    } as MutationOptions<any, any>)
  }

  /**
   * Create a `update` mutation for the given entity.
   */
  public updateMutation<TInputI = { data: UpdateInput<InferEntity<TSchema>> }>({
    input = this.inputFactory.updateInput() as unknown as GraphQLSilk<
      UpdateInput<InferEntity<TSchema>>,
      TInputI
    >,
    ...options
  }: {
    input?: GraphQLSilk<UpdateInput<InferEntity<TSchema>>, TInputI>
    middlewares?: Middleware<
      Loom.Mutation<
        TSchema,
        GraphQLSilk<UpdateInput<InferEntity<TSchema>>, TInputI>
      >
    >[]
  } & GraphQLFieldOptions = {}): Loom.Mutation<
    TSchema,
    GraphQLSilk<UpdateInput<InferEntity<TSchema>>, TInputI>
  > {
    const entity = this.entity

    const middlewares = this.middlewaresWithFlush(options)

    return loom.mutation(entity, {
      ...getFieldOptions(options),
      input,
      middlewares,
      resolve: async (data) => {
        const em = await this.getEm()
        const pk = Utils.extractPK(data, entity.meta)
        const instance = await em.findOneOrFail(entity, pk)
        if (instance == null) return null
        em.assign(instance, data)
        em.persist(instance)
        return instance
      },
    } as MutationOptions<any, any>)
  }

  /**
   * Create a `findOne` query for the given entity.
   */
  public findOneQuery<TInputI = FindOneFilter<InferEntity<TSchema>>>({
    input = this.inputFactory.findOneFilter() as unknown as GraphQLSilk<
      FindOneFilter<InferEntity<TSchema>>,
      TInputI
    >,
    ...options
  }: {
    input?: GraphQLSilk<FindOneFilter<InferEntity<TSchema>>, TInputI>
    middlewares?: Middleware<
      Loom.Query<
        TSchema,
        GraphQLSilk<FindOneFilter<InferEntity<TSchema>>, TInputI>
      >
    >[]
  } & GraphQLFieldOptions = {}): Loom.Query<
    TSchema,
    GraphQLSilk<FindOneFilter<InferEntity<TSchema>>, TInputI>
  > {
    const entity = this.entity

    return loom.query(entity, {
      ...getFieldOptions(options),
      input,
      middlewares: options.middlewares,
      resolve: async (data) => {
        const em = await this.getEm()
        const pk = Utils.extractPK(data, entity.meta)
        const instance = await em.findOneOrFail(entity, pk)
        return instance
      },
    } as QueryOptions<any, any>)
  }

  /**
   * Create a `deleteOne` mutation for the given entity.
   */
  public deleteOneMutation<TInputI = FindOneFilter<InferEntity<TSchema>>>({
    input = this.inputFactory.findOneFilter() as unknown as GraphQLSilk<
      FindOneFilter<InferEntity<TSchema>>,
      TInputI
    >,
    ...options
  }: {
    input?: GraphQLSilk<FindOneFilter<InferEntity<TSchema>>, TInputI>
    middlewares?: Middleware<
      Loom.Mutation<
        NullableSilk<TSchema>,
        GraphQLSilk<FindOneFilter<InferEntity<TSchema>>, TInputI>
      >
    >[]
  } & GraphQLFieldOptions = {}): Loom.Mutation<
    NullableSilk<TSchema>,
    GraphQLSilk<FindOneFilter<InferEntity<TSchema>>, TInputI>
  > {
    const entity = this.entity

    const middlewares = this.middlewaresWithFlush(options)

    return loom.mutation(silk.nullable(entity), {
      ...getFieldOptions(options),
      input,
      middlewares,
      resolve: async (data) => {
        const em = await this.getEm()
        const pk = Utils.extractPK(data, entity.meta)
        const instance = await em.findOne(entity, pk)
        if (instance == null) return null
        em.remove(instance)
        return instance
      },
    } as MutationOptions<any, any>)
  }

  /**
   * Create a `findMany` query for the given entity.
   */
  public findManyQuery<TInputI = FindManyOptions<InferEntity<TSchema>>>({
    input = this.inputFactory.findManyOptions(),
    ...options
  }: {
    input?: GraphQLSilk<FindAllOptions<InferEntity<TSchema>>, TInputI>
    middlewares?: Middleware<
      Loom.Query<
        NullableSilk<TSchema>,
        GraphQLSilk<FindAllOptions<InferEntity<TSchema>>, TInputI>
      >
    >[]
  } & GraphQLFieldOptions = {}): Loom.Query<
    ListSilk<TSchema>,
    GraphQLSilk<FindAllOptions<InferEntity<TSchema>>, TInputI>
  > {
    const entity = this.entity

    return loom.query(silk.list(entity), {
      ...getFieldOptions(options),
      input,
      middlewares: options.middlewares,
      resolve: async (data) => {
        const em = await this.getEm()
        return em.findAll(entity, data)
      },
    } as QueryOptions<any, any>)
  }

  protected middlewaresWithFlush<TField extends Loom.BaseField>({
    middlewares,
  }: {
    middlewares?: Middleware<TField>[]
  }): Middleware<TField>[] {
    return middlewares?.includes(this.flushMiddleware)
      ? middlewares
      : [...(middlewares ?? []), this.flushMiddleware]
  }
}

export class MikroInputFactory<
  TSchema extends EntitySchema<any, any> & GraphQLSilk,
> {
  public constructor(protected readonly entity: TSchema) {}

  public createInput(): GraphQLSilk<
    RequiredEntityData<InferEntity<TSchema>>,
    { data: RequiredEntityData<InferEntity<TSchema>> }
  > {
    const name = `${this.entity.meta.name}CreateInput`

    const gqlType =
      weaverContext.getNamedType(name) ??
      weaverContext.memoNamedType(
        MikroWeaver.getGraphQLType(this.entity, {
          partial: this.entity.meta.primaryKeys,
          name: `${this.entity.meta.name}CreateInput`,
        })
      )

    return silk(
      new GraphQLObjectType({
        name: name + "Wrapper",
        fields: { data: { type: gqlType } },
      }) as GraphQLOutputType,
      (value) => ({ value: value.data })
    )
  }

  public updateInput(): GraphQLSilk<
    UpdateInput<InferEntity<TSchema>>,
    { data: UpdateInput<InferEntity<TSchema>> }
  > {
    const name = `${this.entity.meta.name}UpdateInput`
    const gqlType =
      weaverContext.getNamedType(name) ??
      weaverContext.memoNamedType(
        MikroWeaver.getGraphQLType(this.entity, {
          partial: true,
          required: this.entity.meta.primaryKeys,
          name,
        })
      )

    return silk(
      new GraphQLObjectType({
        name: name + "Wrapper",
        fields: { data: { type: gqlType } },
      }) as GraphQLOutputType,
      (value) => ({ value: value.data })
    )
  }

  public findOneFilter(): GraphQLSilk<
    FindOneFilter<InferEntity<TSchema>>,
    FindOneFilter<InferEntity<TSchema>>
  > {
    const name = `${this.entity.meta.name}FindOneFilter`

    const gqlType =
      weaverContext.getNamedType(name) ??
      weaverContext.memoNamedType(
        MikroWeaver.getGraphQLType(this.entity, {
          pick: this.entity.meta.primaryKeys,
          name,
        })
      )

    return silk(gqlType, (value) => ({ value }))
  }

  public findManyOptions(): GraphQLSilk<any, any> {
    const name = `${this.entity.meta.name}FindManyOptions`

    const whereType = this.findManyOptionsWhereType()

    const optionsType =
      weaverContext.getNamedType(name) ??
      weaverContext.memoNamedType(
        new GraphQLObjectType({
          name: name,
          fields: () => ({
            where: { type: whereType },
            orderBy: {
              type: this.findManyOptionsOrderByType(),
            },
            skip: {
              type: GraphQLInt,
            },
            limit: {
              type: GraphQLInt,
            },
          }),
        })
      )

    const properties = this.entity.meta.properties
    const comparisonKeys = new Set<string>()

    Object.entries(properties).map(([key, property]) => {
      const type = MikroWeaver.getFieldType(property)
      if (type == null) return mapValue.SKIP
      if (type instanceof GraphQLScalarType) comparisonKeys.add(key)
    })

    return silk(optionsType, (value: any) => {
      if ("where" in value && typeof value.where === "object") {
        Object.entries(value.where)
          .filter(([key]) => comparisonKeys.has(key))
          .forEach(([key, property]) => {
            const conditions: Record<string, any> = {}
            if (typeof property !== "object" || property == null) return
            Object.entries(property).forEach(
              ([key, value]) => (conditions[`$${key}`] = value)
            )
            ;(value as any).where[key] = conditions
          })
      }
      return value
    })
  }

  public findManyOptionsOrderByType(): GraphQLObjectType {
    const name = `${this.entity.meta.name}FindManyOptionsOrderBy`
    return (
      weaverContext.getNamedType(name) ??
      weaverContext.memoNamedType(
        new GraphQLObjectType({
          name,
          fields: () =>
            mapValue(this.entity.meta.properties, (property) => {
              const type = MikroWeaver.getFieldType(property)
              if (type == null) return mapValue.SKIP
              return {
                type: MikroInputFactory.queryOrderType(),
                description: property.comment,
              } as GraphQLFieldConfig<any, any>
            }),
        })
      )
    )
  }

  public findManyOptionsWhereType(): GraphQLObjectType {
    const name = `${this.entity.meta.name}FindManyOptionsWhere`

    return (
      weaverContext.getNamedType(name) ??
      weaverContext.memoNamedType(
        new GraphQLObjectType({
          name,
          fields: () =>
            mapValue(this.entity.meta.properties, (property) => {
              const type = MikroWeaver.getFieldType(property)
              if (type == null) return mapValue.SKIP
              return {
                type:
                  type instanceof GraphQLScalarType
                    ? MikroInputFactory.comparisonOperatorsType(type)
                    : type,
                description: property.comment,
              } as GraphQLFieldConfig<any, any>
            }),
        })
      )
    )
  }

  public static queryOrderType(): GraphQLEnumType {
    const name = `MikroQueryOrder`

    return (
      weaverContext.getNamedType(name) ??
      weaverContext.memoNamedType(
        new GraphQLEnumType({
          name,
          values: {
            ASC: { value: QueryOrder.ASC },
            ASC_NULLS_LAST: { value: QueryOrder.ASC_NULLS_LAST },
            ASC_NULLS_FIRST: { value: QueryOrder.ASC_NULLS_FIRST },
            DESC: { value: QueryOrder.DESC },
            DESC_NULLS_LAST: { value: QueryOrder.DESC_NULLS_LAST },
            DESC_NULLS_FIRST: { value: QueryOrder.DESC_NULLS_FIRST },
          },
        })
      )
    )
  }

  public static comparisonOperatorsType<TScalarType extends GraphQLScalarType>(
    type: TScalarType
  ): GraphQLObjectType {
    // https://mikro-orm.io/docs/query-conditions#comparison
    const name = `${type.name}MikroComparisonOperators`

    return (
      weaverContext.getNamedType(name) ??
      weaverContext.memoNamedType(
        new GraphQLObjectType({
          name,
          fields: {
            eq: {
              type,
              description:
                "Equals. Matches values that are equal to a specified value.",
            },
            gt: {
              type,
              description:
                "Greater. Matches values that are greater than a specified value.",
            },
            gte: {
              type,
              description:
                "Greater or Equal. Matches values that are greater than or equal to a specified value.",
            },
            in: {
              type: new GraphQLList(new GraphQLNonNull(type)),
              description:
                "Contains, Contains, Matches any of the values specified in an array.",
            },
            lt: {
              type,
              description:
                "Lower, Matches values that are less than a specified value.",
            },
            lte: {
              type,
              description:
                "Lower or equal, Matches values that are less than or equal to a specified value.",
            },
            ne: {
              type,
              description:
                "Not equal. Matches all values that are not equal to a specified value.",
            },
            nin: {
              type: new GraphQLList(new GraphQLNonNull(type)),
              description:
                "Not contains. Matches none of the values specified in an array.",
            },
            overlap: {
              type: new GraphQLList(new GraphQLNonNull(type)),
              description: "&&",
            },
            contains: {
              type: new GraphQLList(new GraphQLNonNull(type)),
              description: "@>",
            },
            contained: {
              type: new GraphQLList(new GraphQLNonNull(type)),
              description: "<@",
            },
            ...(type === GraphQLString
              ? {
                  like: {
                    type,
                    description: "Like. Uses LIKE operator",
                  },
                  re: {
                    type,
                    description: "Regexp. Uses REGEXP operator",
                  },
                  fulltext: {
                    type,
                    description:
                      "Full text.	A driver specific full text search function.",
                  },
                  ilike: {
                    type,
                    description: "ilike",
                  },
                }
              : {}),
          },
        })
      )
    )
  }
}

type NullableSilk<T extends GraphQLSilk> = GraphQLSilk<
  StandardSchemaV1.InferOutput<T> | null,
  undefined
>

export type UpdateInput<TEntity> = Omit<
  Partial<TEntity>,
  PrimaryProperty<TEntity>
> & {
  [P in PrimaryProperty<TEntity>]: P extends keyof TEntity ? TEntity[P] : never
}

export type FindOneFilter<TEntity> = {
  [P in PrimaryProperty<TEntity>]: P extends keyof TEntity ? TEntity[P] : never
}

export interface FindManyOptions<TEntity> {
  where?: any // It's difficult to type
  orderBy?: {
    [P in keyof TEntity]?: QueryOrder
  }
  limit?: number
  offset?: number
}
