import type { SYMBOLS, WeaverConfig } from "@gqloom/core"
import type {
  EntityName,
  EntityProperty,
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

export type InferEntity<TEntityName extends EntityName<any>> =
  TEntityName extends EntityName<infer TEntity> ? TEntity : never

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

export interface MikroSilkConfig<TEntity extends object>
  extends Partial<Omit<GraphQLObjectTypeConfig<any, any>, "fields">> {
  fields?: ValueOrGetter<{
    [K in keyof TEntity]?:
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
  metadata?: MetadataStorage
}

export type ValueOrGetter<T> = T | (() => T)
