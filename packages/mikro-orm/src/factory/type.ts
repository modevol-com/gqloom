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

export interface CountArgs<TEntity extends object>
  extends CountOptions<TEntity> {
  where?: FilterQuery<TEntity>
}

export interface CountQuery<
  TEntity extends object,
  TInputI = CountArgs<TEntity>,
> extends QueryFactoryWithResolve<
    CountArgs<TEntity>,
    GraphQLSilk<number, number>,
    GraphQLSilk<CountArgs<TEntity>, TInputI>
  > {}
