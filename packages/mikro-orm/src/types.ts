import type { GraphQLSilk, MayPromise, WeaverConfig } from "@gqloom/core"
import type { SYMBOLS } from "@gqloom/core"
import type {
  EntityManager,
  EntityProperty,
  EntitySchema,
  MetadataStorage,
  PropertyOptions,
} from "@mikro-orm/core"
import type {
  GraphQLFieldConfig,
  GraphQLObjectTypeConfig,
  GraphQLOutputType,
} from "graphql"

export interface GQLoomMikroFieldExtensions {
  mikroProperty?: PropertyOptions<any>
}

export type InferEntity<TSchema extends EntitySchema<any, any>> =
  TSchema extends EntitySchema<infer TEntity, any> ? TEntity : never

export interface MikroWeaverConfigOptions {
  presetGraphQLType?: (
    property: EntityProperty
  ) => GraphQLOutputType | undefined
}

export interface MikroWeaverConfig
  extends WeaverConfig,
    MikroWeaverConfigOptions {
  [SYMBOLS.WEAVER_CONFIG]: "gqloom.mikro-orm"
}

export interface MikroSilkConfig<TSchema extends EntitySchema<any, any>>
  extends Partial<Omit<GraphQLObjectTypeConfig<any, any>, "fields">> {
  fields?: ValueOrGetter<{
    [K in keyof InferEntity<TSchema>]?:
      | (Omit<GraphQLFieldConfig<any, any>, "type"> & {
          /**
           * The type of the field, set to `null` to hide the field
           */
          type?:
            | ValueOrGetter<
                GraphQLOutputType | typeof SYMBOLS.FIELD_HIDDEN | null
              >
            | undefined
        })
      | typeof SYMBOLS.FIELD_HIDDEN
      | undefined
  }>
}

export type ValueOrGetter<T> = T | (() => T)

export interface MikroResolverFactoryOptions<
  TSchema extends EntitySchema<any, any>,
> {
  getEntityManager: () => MayPromise<EntityManager>
  input?: MikroFactoryPropertyBehaviors<InferEntity<TSchema>>
  metadata?: MetadataStorage
}

export interface PropertyBehavior<TOutput> {
  /**
   * Is this property visible in the filters?
   */
  filters?: boolean | typeof SYMBOLS.FIELD_HIDDEN

  /**
   * Is this property visible in the create mutation input?
   */
  create?: boolean | typeof SYMBOLS.FIELD_HIDDEN | GraphQLSilk<TOutput, any>
  /**
   * Is this property visible in the update mutation input?
   */
  update?: boolean | typeof SYMBOLS.FIELD_HIDDEN | GraphQLSilk<TOutput, any>
}

export type MikroFactoryPropertyBehaviors<TEntity> = {
  [K in keyof TEntity]?:
    | PropertyBehavior<TEntity[K]>
    | GraphQLSilk<TEntity[K], any>
    | boolean
    | typeof SYMBOLS.FIELD_HIDDEN
    | undefined
} & {
  /**
   * Config the default behavior of all properties
   */
  "*"?: PropertyBehavior<never> | boolean | undefined
}
