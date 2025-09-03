import type {
  GraphQLSilk,
  MayPromise,
  QueryFactoryWithResolve,
} from "@gqloom/core"
import type {
  CountOptions,
  EntityManager,
  FilterQuery,
  MetadataStorage,
} from "@mikro-orm/core"

export interface MikroResolverFactoryOptions<TEntity extends object> {
  getEntityManager: () => MayPromise<EntityManager>
  input?: MikroFactoryPropertyBehaviors<TEntity>
  metadata?: MetadataStorage
}

export interface PropertyBehavior<TOutput> {
  /**
   * Is this property visible in the filters?
   */
  filters?: boolean

  /**
   * Is this property visible in the create mutation input?
   */
  create?: boolean | GraphQLSilk<TOutput, any>
  /**
   * Is this property visible in the update mutation input?
   */
  update?: boolean | GraphQLSilk<TOutput, any>
}

export type MikroFactoryPropertyBehaviors<TEntity> = {
  [K in keyof TEntity]?:
    | PropertyBehavior<TEntity[K]>
    | GraphQLSilk<TEntity[K], any>
    | boolean
    | undefined
} & {
  /**
   * Config the default behavior of all properties
   */
  "*"?: PropertyBehavior<never> | boolean | undefined
}

export type ComparisonOperators<TScalar> = {
  eq?: TScalar
  gt?: TScalar
  gte?: TScalar
  in?: TScalar[]
  lt?: TScalar
  lte?: TScalar
  ne?: TScalar
  nin?: TScalar[]
  overlap?: TScalar[]
  contains?: TScalar[]
  contained?: TScalar[]
  like?: TScalar extends string ? TScalar : never
  re?: TScalar extends string ? TScalar : never
  fulltext?: TScalar extends string ? TScalar : never
  ilike?: TScalar extends string ? TScalar : never
}

export type FilterArgs<TEntity extends object> = {
  [K in keyof TEntity]?: ComparisonOperators<TEntity[K]>
} & {
  and?: FilterArgs<TEntity>[]
  or?: FilterArgs<TEntity>[]
}

export interface CountQueryArgs<TEntity extends object>
  extends Pick<CountOptions<TEntity>, never> {
  where?: FilterArgs<TEntity>
}

export interface CountQueryOptions<TEntity extends object>
  extends CountOptions<TEntity> {
  where?: FilterQuery<TEntity>
}

export interface CountQuery<
  TEntity extends object,
  TInputI = CountQueryArgs<TEntity>,
> extends QueryFactoryWithResolve<
    CountQueryOptions<TEntity>,
    GraphQLSilk<number, number>,
    GraphQLSilk<CountQueryOptions<TEntity>, TInputI>
  > {}
