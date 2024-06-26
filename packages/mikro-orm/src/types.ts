import { type WeaverConfig, type SYMBOLS, type GraphQLSilk } from "@gqloom/core"
import {
  type RequiredEntityData,
  type EntityProperty,
  type EntitySchema,
  type PropertyOptions,
} from "@mikro-orm/core"
import { type GraphQLOutputType } from "graphql"

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

export type EntitySchemaSilk<TSchema extends EntitySchema> = TSchema &
  GraphQLSilk<InferEntity<TSchema>, RequiredEntityData<InferEntity<TSchema>>>
