import type {
  GraphQLSilk,
  MayPromise,
  MutationFactoryWithResolve,
  QueryFactoryWithResolve,
} from "@gqloom/core"
import type {
  CountOptions,
  CreateOptions,
  Cursor,
  DeleteOptions,
  EntityData,
  EntityManager,
  FilterQuery,
  FindByCursorOptions,
  FindOneOptions,
  FindOptions,
  MetadataStorage,
  NativeInsertUpdateOptions,
  RequiredEntityData,
  UpdateOptions,
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
  totalCount: number
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
    "orderBy" | "after" | "before" | "first" | "last" | "includeCount"
  > {
  where?: FilterArgs<TEntity>
}

export interface FindByCursorQueryOptions<TEntity extends object>
  extends FindByCursorOptions<TEntity, any, any, any, any> {
  where?: FilterQuery<TEntity>
}

export interface FindByCursorOutput<TEntity extends object>
  extends Pick<
    Cursor<TEntity>,
    | "items"
    | "totalCount"
    | "hasPrevPage"
    | "hasNextPage"
    | "startCursor"
    | "endCursor"
    | "length"
  > {}

export interface FindByCursorQuery<
  TEntity extends object,
  TInputI = FindByCursorQueryArgs<TEntity>,
> extends QueryFactoryWithResolve<
    FindByCursorQueryOptions<TEntity>,
    GraphQLSilk<FindByCursorOutput<TEntity>, Cursor<TEntity>>,
    GraphQLSilk<FindByCursorQueryOptions<TEntity>, TInputI>
  > {}

export interface FindOneQueryArgs<TEntity extends object>
  extends Pick<FindOneOptions<TEntity, any, any, any>, "orderBy" | "offset"> {
  where: FilterArgs<TEntity>
}

export interface FindOneQueryOptions<TEntity extends object>
  extends FindOneOptions<TEntity, any, any, any> {
  where: FilterQuery<TEntity>
}

export interface FindOneQuery<
  TEntity extends object,
  TInputI = FindOneQueryArgs<TEntity>,
> extends QueryFactoryWithResolve<
    FindOneQueryOptions<TEntity>,
    GraphQLSilk<TEntity | null, TEntity | null>,
    GraphQLSilk<FindOneQueryOptions<TEntity>, TInputI>
  > {}

export interface FindOneOrFailQuery<
  TEntity extends object,
  TInputI = FindOneQueryArgs<TEntity>,
> extends QueryFactoryWithResolve<
    FindOneQueryOptions<TEntity>,
    GraphQLSilk<TEntity, TEntity>,
    GraphQLSilk<FindOneQueryOptions<TEntity>, TInputI>
  > {}

export interface CreateMutationArgs<TEntity extends object>
  extends Pick<CreateOptions<any>, never> {
  data: RequiredEntityData<TEntity>
}

export interface CreateMutationOptions<TEntity extends object>
  extends CreateOptions<any> {
  data: RequiredEntityData<TEntity>
}

export interface CreateMutation<
  TEntity extends object,
  TInputI = CreateMutationArgs<TEntity>,
> extends MutationFactoryWithResolve<
    CreateMutationOptions<TEntity>,
    GraphQLSilk<TEntity, TEntity>,
    GraphQLSilk<CreateMutationOptions<TEntity>, TInputI>
  > {}

export interface InsertMutationArgs<TEntity extends object>
  extends Pick<NativeInsertUpdateOptions<TEntity>, never> {
  data: RequiredEntityData<TEntity>
}

export interface InsertMutationOptions<TEntity extends object>
  extends NativeInsertUpdateOptions<TEntity> {
  data: RequiredEntityData<TEntity>
}

export interface InsertMutation<
  TEntity extends object,
  TInputI = InsertMutationArgs<TEntity>,
> extends MutationFactoryWithResolve<
    InsertMutationOptions<TEntity>,
    GraphQLSilk<TEntity, TEntity>,
    GraphQLSilk<InsertMutationOptions<TEntity>, TInputI>
  > {}

export interface InsertManyMutationArgs<TEntity extends object>
  extends Pick<NativeInsertUpdateOptions<TEntity>, never> {
  data: RequiredEntityData<TEntity>[]
}

export interface InsertManyMutationOptions<TEntity extends object>
  extends NativeInsertUpdateOptions<TEntity> {
  data: RequiredEntityData<TEntity>[]
}

export interface InsertManyMutation<
  TEntity extends object,
  TInputI = InsertManyMutationArgs<TEntity>,
> extends MutationFactoryWithResolve<
    InsertManyMutationOptions<TEntity>,
    GraphQLSilk<TEntity[], TEntity[]>,
    GraphQLSilk<InsertManyMutationOptions<TEntity>, TInputI>
  > {}

export interface DeleteMutationArgs<TEntity extends object>
  extends Pick<DeleteOptions<TEntity>, never> {
  where: FilterArgs<TEntity>
}

export interface DeleteMutationOptions<TEntity extends object>
  extends DeleteOptions<TEntity> {
  where: FilterQuery<TEntity>
}

export interface DeleteMutation<
  TEntity extends object,
  TInputI = DeleteMutationArgs<TEntity>,
> extends MutationFactoryWithResolve<
    DeleteMutationOptions<TEntity>,
    GraphQLSilk<number, number>,
    GraphQLSilk<DeleteMutationOptions<TEntity>, TInputI>
  > {}

export interface UpdateMutationArgs<TEntity extends object>
  extends Pick<UpdateOptions<TEntity>, never> {
  data: EntityData<TEntity>
  where: FilterArgs<TEntity>
}

export interface UpdateMutationOptions<TEntity extends object>
  extends UpdateOptions<TEntity> {
  data: EntityData<TEntity>
  where: FilterQuery<TEntity>
}

export interface UpdateMutation<
  TEntity extends object,
  TInputI = UpdateMutationArgs<TEntity>,
> extends MutationFactoryWithResolve<
    UpdateMutationOptions<TEntity>,
    GraphQLSilk<number, number>,
    GraphQLSilk<UpdateMutationOptions<TEntity>, TInputI>
  > {}
