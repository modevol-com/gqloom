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
  isNonNullType,
} from "graphql"
import { type GraphQLFieldConfig, GraphQLInt } from "graphql"
import { MikroWeaver } from "."
import type {
  InferEntity,
  MikroFactoryPropertyBehaviors,
  MikroResolverFactoryOptions,
} from "./types"

export class MikroResolverFactory<
  TSchema extends EntitySchema<any, any> & GraphQLSilk,
> {
  public readonly options: MikroResolverFactoryOptions<InferEntity<TSchema>>
  protected flushMiddleware: Middleware
  protected inputFactory: MikroInputFactory<TSchema>
  public constructor(
    protected readonly entity: TSchema,
    optionsOrGetEntityManager:
      | MikroResolverFactoryOptions<InferEntity<TSchema>>
      | (() => MayPromise<EntityManager>)
  ) {
    if (typeof optionsOrGetEntityManager === "function") {
      this.options = { getEntityManager: optionsOrGetEntityManager }
    } else {
      this.options = optionsOrGetEntityManager
    }

    entity.init()

    this.inputFactory = new MikroInputFactory(entity, this.options)
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
  public constructor(
    protected readonly entity: TSchema,
    protected readonly options?: MikroResolverFactoryOptions<
      InferEntity<TSchema>
    >
  ) {}

  public createInput(): GraphQLSilk<
    RequiredEntityData<InferEntity<TSchema>>,
    { data: RequiredEntityData<InferEntity<TSchema>> }
  > {
    const name = `${this.entity.meta.name}CreateInput`

    const gqlType =
      weaverContext.getNamedType(name) ??
      weaverContext.memoNamedType(this.buildCreateInputType(name))

    return silk(
      new GraphQLObjectType({
        name: name + "Wrapper",
        fields: { data: { type: new GraphQLNonNull(gqlType) } },
      }) as GraphQLOutputType,
      async (value) => {
        if (this.options?.input) {
          const validatedData = await this.validateCreateInput(value.data, [
            "data",
          ])
          if (validatedData.issues) {
            throw new Error(
              `Validation failed: ${validatedData.issues.map((i) => i.message).join(", ")}`
            )
          }
          return { value: validatedData.value }
        }
        return { value: value.data }
      }
    )
  }

  protected buildCreateInputType(name: string): GraphQLObjectType {
    return new GraphQLObjectType({
      name,
      fields: () =>
        mapValue(this.entity.meta.properties, (property, propertyName) => {
          // Check visibility
          if (
            !MikroInputFactory.isPropertyVisible(
              propertyName,
              this.options?.input,
              "create"
            )
          ) {
            return mapValue.SKIP
          }

          // Get custom type if configured
          const customSilk = MikroInputFactory.getPropertyConfig(
            this.options?.input,
            propertyName,
            "create"
          )
          const type = customSilk
            ? weaverContext.getGraphQLType(customSilk)
            : MikroWeaver.getFieldType(property, this.entity)

          if (type == null) return mapValue.SKIP

          // Handle required fields - in MikroORM, nullable defaults to false for non-optional fields
          const isRequired =
            property.nullable !== true && !property.default && !property.primary
          const finalType =
            isRequired && !isNonNullType(type) ? new GraphQLNonNull(type) : type

          return {
            type: finalType,
            description: property.comment,
          } as GraphQLFieldConfig<any, any>
        }),
    })
  }

  protected async validateCreateInput(
    data: RequiredEntityData<InferEntity<TSchema>>,
    path: ReadonlyArray<PropertyKey>
  ): Promise<
    StandardSchemaV1.Result<RequiredEntityData<InferEntity<TSchema>>>
  > {
    const result: any = {}
    const issues: StandardSchemaV1.Issue[] = []

    for (const [propertyName, value] of Object.entries(data)) {
      const customSilk = MikroInputFactory.getPropertyConfig(
        this.options?.input,
        propertyName,
        "create"
      )
      if (customSilk && customSilk["~standard"]) {
        const validationResult = await customSilk["~standard"].validate(value)
        if ("value" in validationResult) {
          result[propertyName] = validationResult.value
        }
        if (validationResult.issues) {
          issues.push(
            ...validationResult.issues.map((issue) => ({
              ...issue,
              path: [...path, propertyName, ...(issue.path ?? [])],
            }))
          )
        }
      } else {
        result[propertyName] = value
      }
    }

    return { value: result, ...(issues.length > 0 && { issues }) }
  }

  public updateInput(): GraphQLSilk<
    UpdateInput<InferEntity<TSchema>>,
    { data: UpdateInput<InferEntity<TSchema>> }
  > {
    const name = `${this.entity.meta.name}UpdateInput`
    const gqlType =
      weaverContext.getNamedType(name) ??
      weaverContext.memoNamedType(this.buildUpdateInputType(name))

    return silk(
      new GraphQLObjectType({
        name: name + "Wrapper",
        fields: { data: { type: new GraphQLNonNull(gqlType) } },
      }) as GraphQLOutputType,
      async (value) => {
        if (this.options?.input) {
          const validatedData = await this.validateUpdateInput(value.data, [
            "data",
          ])
          if (validatedData.issues) {
            throw new Error(
              `Validation failed: ${validatedData.issues.map((i) => i.message).join(", ")}`
            )
          }
          return { value: validatedData.value }
        }
        return { value: value.data }
      }
    )
  }

  protected buildUpdateInputType(name: string): GraphQLObjectType {
    return new GraphQLObjectType({
      name,
      fields: () =>
        mapValue(this.entity.meta.properties, (property, propertyName) => {
          // Check visibility
          if (
            !MikroInputFactory.isPropertyVisible(
              propertyName,
              this.options?.input,
              "update"
            )
          ) {
            return mapValue.SKIP
          }

          // Get custom type if configured
          const customSilk = MikroInputFactory.getPropertyConfig(
            this.options?.input,
            propertyName,
            "update"
          )
          const type = customSilk
            ? weaverContext.getGraphQLType(customSilk)
            : MikroWeaver.getFieldType(property, this.entity)

          if (type == null) return mapValue.SKIP

          // For update operations, make all fields optional except primary keys
          let finalType = type
          if (
            this.entity.meta.primaryKeys.includes(propertyName) &&
            !isNonNullType(type)
          ) {
            finalType = new GraphQLNonNull(type)
          } else if (
            isNonNullType(type) &&
            !this.entity.meta.primaryKeys.includes(propertyName)
          ) {
            finalType = type.ofType
          }

          return {
            type: finalType,
            description: property.comment,
          } as GraphQLFieldConfig<any, any>
        }),
    })
  }

  protected async validateUpdateInput(
    data: UpdateInput<InferEntity<TSchema>>,
    path: ReadonlyArray<PropertyKey>
  ): Promise<StandardSchemaV1.Result<UpdateInput<InferEntity<TSchema>>>> {
    const result: any = {}
    const issues: StandardSchemaV1.Issue[] = []

    for (const [propertyName, value] of Object.entries(data)) {
      const customSilk = MikroInputFactory.getPropertyConfig(
        this.options?.input,
        propertyName,
        "update"
      )
      if (customSilk && customSilk["~standard"]) {
        const validationResult = await customSilk["~standard"].validate(value)
        if ("value" in validationResult) {
          result[propertyName] = validationResult.value
        }
        if (validationResult.issues) {
          issues.push(
            ...validationResult.issues.map((issue) => ({
              ...issue,
              path: [...path, propertyName, ...(issue.path ?? [])],
            }))
          )
        }
      } else {
        result[propertyName] = value
      }
    }

    return { value: result, ...(issues.length > 0 && { issues }) }
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
      // Check visibility for filters
      if (
        !MikroInputFactory.isPropertyVisible(
          key,
          this.options?.input,
          "filters"
        )
      ) {
        return mapValue.SKIP
      }

      const type = MikroWeaver.getFieldType(property, this.entity)
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
      return { value }
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
            mapValue(this.entity.meta.properties, (property, propertyName) => {
              // Check visibility for filters (ordering is typically tied to filtering)
              if (
                !MikroInputFactory.isPropertyVisible(
                  propertyName,
                  this.options?.input,
                  "filters"
                )
              ) {
                return mapValue.SKIP
              }

              const type = MikroWeaver.getFieldType(property, this.entity)
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
            mapValue(this.entity.meta.properties, (property, propertyName) => {
              // Check visibility for filters
              if (
                !MikroInputFactory.isPropertyVisible(
                  propertyName,
                  this.options?.input,
                  "filters"
                )
              ) {
                return mapValue.SKIP
              }

              const type = MikroWeaver.getFieldType(property, this.entity)
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

  public static isPropertyVisible(
    propertyName: string,
    behaviors: MikroFactoryPropertyBehaviors<any> | undefined,
    operation: "filters" | "create" | "update"
  ): boolean {
    if (!behaviors) return true

    const behavior = behaviors[propertyName]
    const defaultBehavior = behaviors["*"]

    // Direct boolean value
    if (typeof behavior === "boolean") return behavior

    // GraphQLSilk (has ~standard property)
    if (behavior && typeof behavior === "object" && "~standard" in behavior) {
      return true
    }

    // PropertyBehavior object
    if (typeof behavior === "object") {
      const operationConfig = behavior[operation]
      if (typeof operationConfig === "boolean") return operationConfig
      if (
        operationConfig &&
        typeof operationConfig === "object" &&
        "~standard" in operationConfig
      )
        return true
    }

    // Check default behavior
    if (typeof defaultBehavior === "boolean") return defaultBehavior

    if (typeof defaultBehavior === "object") {
      const operationConfig = defaultBehavior[operation]
      if (typeof operationConfig === "boolean") return operationConfig
    }

    return true
  }

  public static getPropertyConfig<TEntity>(
    behaviors: MikroFactoryPropertyBehaviors<TEntity> | undefined,
    propertyName: keyof TEntity,
    operation: "create" | "update"
  ): GraphQLSilk<any, any> | undefined {
    if (!behaviors) return undefined

    const behavior = behaviors[propertyName]

    // Direct GraphQLSilk
    if (behavior && typeof behavior === "object" && "~standard" in behavior) {
      return behavior as GraphQLSilk<any, any>
    }

    // PropertyBehavior object with operation-specific silk
    if (typeof behavior === "object") {
      const operationConfig = behavior[operation]
      if (
        operationConfig &&
        typeof operationConfig === "object" &&
        "~standard" in operationConfig
      ) {
        return operationConfig as GraphQLSilk<any, any>
      }
    }

    return undefined
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
