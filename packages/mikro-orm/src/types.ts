import { type WeaverConfig, type SYMBOLS } from "@gqloom/core"
import {
  type OptionalProps,
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

export type InferEntityData<T extends EntitySchema> = Omit<
  InferEntity<T>,
  typeof OptionalProps
>

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
