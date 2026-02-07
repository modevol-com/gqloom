import type { GraphQLSilk, SYMBOLS, WeaverConfig } from "@gqloom/core"
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
  /**
   * Database dialect. Used to determine which Filter comparison operators are exposed (e.g. ilike, overlap are PostgreSQL-only).
   */
  dialect?:
    | "PostgreSQL"
    | "postgreSQL"
    | "MySQL"
    | "mysql"
    | "SQLite"
    | "sqlite"
    | "MongoDB"
    | "mongodb"
    | null

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
                | GraphQLOutputType
                | typeof SYMBOLS.FIELD_HIDDEN
                | null
                | GraphQLSilk<any, any>
              >
            | undefined
        })
      | ValueOrGetter<GraphQLSilk<any, any> | GraphQLOutputType>
      | typeof SYMBOLS.FIELD_HIDDEN
      | undefined
  }>
  metadata?: MetadataStorage
}

export type ValueOrGetter<T> = T | (() => T)
