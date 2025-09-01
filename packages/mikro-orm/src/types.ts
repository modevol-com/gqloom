import type { WeaverConfig } from "@gqloom/core"
import type { SYMBOLS } from "@gqloom/core"
import type {
  EntityProperty,
  EntitySchema,
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
