import type {
  FieldFactoryWithResolve,
  GraphQLSilk,
  MayPromise,
  MutationFactoryWithResolve,
  QueryFactoryWithResolve,
  ResolverPayload,
} from "@gqloom/core"
import type {
  Collection,
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
  InitCollectionOptions,
  MetadataStorage,
  NativeInsertUpdateOptions,
  Reference,
  RequiredEntityData,
  ScalarReference,
  UpdateOptions,
  UpsertOptions,
} from "@mikro-orm/core"

export interface MikroResolverFactoryOptions<TEntity extends object> {
  getEntityManager: (
    payload: ResolverPayload | undefined
  ) => MayPromise<EntityManager>
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

export type InferRelationKeys<TEntity> = {
  [K in keyof TEntity]?: TEntity[K] extends Reference<any> | Collection<any>
    ? K
    : never
}[keyof TEntity]

export type InferReferenceKeys<TEntity> = {
  [K in keyof TEntity]?: TEntity[K] extends Collection<any>
    ? never
    : TEntity[K] extends Reference<any>
      ? K
      : never
}[keyof TEntity]

export type InferCollectionKeys<TEntity> = {
  [K in keyof TEntity]?: TEntity[K] extends Collection<any> ? K : never
}[keyof TEntity]

export type InferScalarReferenceKeys<TEntity> = {
  [K in keyof TEntity]?: TEntity[K] extends ScalarReference<any> ? K : never
}[keyof TEntity]

export type RelationField<
  TEntity extends object,
  TKey,
> = TKey extends InferCollectionKeys<TEntity>
  ? CollectionField<TEntity, TKey>
  : TKey extends InferReferenceKeys<TEntity>
    ? ReferenceField<TEntity, TKey>
    : never

export interface ReferenceField<TEntity extends object, TKey>
  extends FieldFactoryWithResolve<
    GraphQLSilk<Partial<TEntity>, Partial<TEntity>>,
    GraphQLSilk<
      Partial<RelationEntity<TEntity, TKey>>,
      Partial<RelationEntity<TEntity, TKey>>
    >
  > {}

export interface CollectionFieldArgs<TEntity extends object, TKey>
  extends Pick<
    InitCollectionOptions<RelationEntity<TEntity, TKey>, any, any, any>,
    never
  > {
  where?: RelationEntity<TEntity, TKey> extends object
    ? FilterQuery<RelationEntity<TEntity, TKey>>
    : never
}

export interface CollectionFieldOptions<TEntity extends object, TKey>
  extends InitCollectionOptions<RelationEntity<TEntity, TKey>, any, any, any> {}

export interface CollectionField<
  TEntity extends object,
  TKey,
  TInputI = CollectionFieldArgs<TEntity, TKey>,
> extends FieldFactoryWithResolve<
    GraphQLSilk<Partial<TEntity>, Partial<TEntity>>,
    GraphQLSilk<
      Partial<RelationEntity<TEntity, TKey>>[],
      Partial<RelationEntity<TEntity, TKey>>[]
    >,
    CollectionFieldOptions<TEntity, TKey>,
    GraphQLSilk<CollectionFieldOptions<TEntity, TKey>, TInputI>
  > {}

type RelationEntity<TEntity extends object, TKey> = TKey extends keyof TEntity
  ? UnwrapRef<TEntity[TKey]>
  : never

type UnwrapRef<T> =
  T extends ScalarReference<any>
    ? UnwrapScalarReference<T>
    : T extends Reference<any>
      ? UnwrapReference<T>
      : T extends Collection<any>
        ? UnwrapCollection<T>
        : T

type UnwrapScalarReference<T extends ScalarReference<any>> =
  T extends ScalarReference<infer Value> ? Value : T

type UnwrapReference<T extends Reference<any>> =
  T extends Reference<infer Value> ? Value : T

type UnwrapCollection<T> = T extends Collection<infer Value> ? Value : T

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
  AND?: FilterArgs<TEntity>[]
  OR?: FilterArgs<TEntity>[]
  NOT?: FilterArgs<TEntity>
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
    GraphQLSilk<Partial<TEntity>[], Partial<TEntity>[]>,
    GraphQLSilk<FindQueryOptions<TEntity>, TInputI>
  > {}

export interface FindAndCountOutput<TEntity extends object> {
  totalCount: number
  items: Partial<TEntity>[]
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
    | "totalCount"
    | "hasPrevPage"
    | "hasNextPage"
    | "startCursor"
    | "endCursor"
    | "length"
  > {
  items: Partial<TEntity>[]
}

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
    GraphQLSilk<Partial<TEntity> | null, Partial<TEntity> | null>,
    GraphQLSilk<FindOneQueryOptions<TEntity>, TInputI>
  > {}

export interface FindOneOrFailQuery<
  TEntity extends object,
  TInputI = FindOneQueryArgs<TEntity>,
> extends QueryFactoryWithResolve<
    FindOneQueryOptions<TEntity>,
    GraphQLSilk<Partial<TEntity>, Partial<TEntity>>,
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
    GraphQLSilk<Partial<TEntity>, Partial<TEntity>>,
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
    GraphQLSilk<Partial<TEntity>[], Partial<TEntity>[]>,
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

export interface UpsertMutationArgs<TEntity extends object>
  extends Pick<
    UpsertOptions<TEntity>,
    | "onConflictAction"
    | "onConflictExcludeFields"
    | "onConflictFields"
    | "onConflictMergeFields"
  > {
  data: EntityData<TEntity>
}

export interface UpsertMutationOptions<TEntity extends object>
  extends UpsertOptions<TEntity> {
  data: EntityData<TEntity>
}

export interface UpsertMutation<
  TEntity extends object,
  TInputI = UpsertMutationArgs<TEntity>,
> extends MutationFactoryWithResolve<
    UpsertMutationOptions<TEntity>,
    GraphQLSilk<TEntity, TEntity>,
    GraphQLSilk<UpsertMutationOptions<TEntity>, TInputI>
  > {}

export interface UpsertManyMutationArgs<TEntity extends object>
  extends Pick<
    UpsertOptions<TEntity>,
    | "onConflictAction"
    | "onConflictExcludeFields"
    | "onConflictFields"
    | "onConflictMergeFields"
  > {
  data: EntityData<TEntity>[]
}

export interface UpsertManyMutationOptions<TEntity extends object>
  extends UpsertOptions<TEntity> {
  data: EntityData<TEntity>[]
}

export interface UpsertManyMutation<
  TEntity extends object,
  TInputI = UpsertManyMutationArgs<TEntity>,
> extends MutationFactoryWithResolve<
    UpsertManyMutationOptions<TEntity>,
    GraphQLSilk<TEntity[], TEntity[]>,
    GraphQLSilk<UpsertManyMutationOptions<TEntity>, TInputI>
  > {}

export type MikroRelationsResolver<TEntity extends object> = {
  [K in NonNullable<InferRelationKeys<TEntity>>]: TEntity[K] extends Collection<
    any,
    any
  >
    ? CollectionField<TEntity, K>
    : TEntity[K] extends Reference<any>
      ? ReferenceField<TEntity, K>
      : never
}

export type MikroQueriesResolver<
  TEntity extends object,
  TName extends string,
> = MikroRelationsResolver<TEntity> & {
  [key in `count${Capitalize<TName>}`]: CountQuery<TEntity>
} & {
  [key in `find${Capitalize<TName>}`]: FindQuery<TEntity>
} & {
  [key in `find${Capitalize<TName>}ByCursor`]: FindByCursorQuery<TEntity>
} & {
  [key in `findOne${Capitalize<TName>}`]: FindOneQuery<TEntity>
} & {
  [key in `findOne${Capitalize<TName>}OrFail`]: FindOneOrFailQuery<TEntity>
}

export type MikroResolver<
  TEntity extends object,
  TEntityName extends string,
> = MikroQueriesResolver<TEntity, TEntityName> & {
  [key in `create${Capitalize<TEntityName>}`]: CreateMutation<TEntity>
} & {
  [key in `insert${Capitalize<TEntityName>}`]: InsertMutation<TEntity>
} & {
  [key in `insertMany${Capitalize<TEntityName>}`]: InsertManyMutation<TEntity>
} & {
  [key in `delete${Capitalize<TEntityName>}`]: DeleteMutation<TEntity>
} & {
  [key in `update${Capitalize<TEntityName>}`]: UpdateMutation<TEntity>
} & {
  [key in `upsert${Capitalize<TEntityName>}`]: UpsertMutation<TEntity>
} & {
  [key in `upsertMany${Capitalize<TEntityName>}`]: UpsertManyMutation<TEntity>
}
