import type {
  GraphQLSilk,
  MayPromise,
  QueryFactoryWithResolve,
} from "@gqloom/core"
import type {
  CountOptions,
  Cursor,
  EntityManager,
  FilterQuery,
  FindByCursorOptions,
  FindOptions,
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

export interface FindQueryArgs<TEntity extends object>
  extends Pick<FindOptions<TEntity>, "orderBy" | "limit" | "offset"> {
  where?: FilterArgs<TEntity>
}

export interface FindQueryOptions<TEntity extends object>
  extends FindOptions<TEntity, any, any, any> {
  where?: FilterQuery<TEntity> | null | undefined
}

export interface FindQuery<
  TEntity extends object,
  TInputI = FindQueryArgs<TEntity>,
> extends QueryFactoryWithResolve<
    FindQueryOptions<TEntity>,
    GraphQLSilk<TEntity[], TEntity[]>,
    GraphQLSilk<FindQueryOptions<TEntity>, TInputI>
  > {}

export interface FindAndCountOutput<TEntity extends object> {
  count: number
  items: TEntity[]
}

export interface FindAndCountQuery<
  TEntity extends object,
  TInputI = FindQueryArgs<TEntity>,
> extends QueryFactoryWithResolve<
    FindQueryOptions<TEntity>,
    GraphQLSilk<FindAndCountOutput<TEntity>, FindAndCountOutput<TEntity>>,
    GraphQLSilk<FindQueryOptions<TEntity>, TInputI>
  > {}

export interface FindByCursorQueryArgs<TEntity extends object>
  extends Pick<
    FindByCursorOptions<TEntity, any, any, any, any>,
    "orderBy" | "after" | "before" | "first" | "last"
  > {
  where?: FilterArgs<TEntity>
}

export interface FindByCursorQueryOptions<TEntity extends object>
  extends FindByCursorOptions<TEntity, any, any, any, any> {
  where?: FilterQuery<TEntity>
}

export interface FindByCursorQuery<
  TEntity extends object,
  TInputI = FindByCursorQueryArgs<TEntity>,
> extends QueryFactoryWithResolve<
    FindByCursorQueryOptions<TEntity>,
    GraphQLSilk<Cursor<TEntity>, Cursor<TEntity>>,
    GraphQLSilk<FindByCursorQueryOptions<TEntity>, TInputI>
  > {}
