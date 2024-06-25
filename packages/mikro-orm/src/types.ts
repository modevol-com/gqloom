import { type EntitySchema, type PropertyOptions } from "@mikro-orm/core"

export interface GQLoomMikroFieldExtensions {
  mikroProperty?: PropertyOptions<any>
}

export type InferEntity<TSchema extends EntitySchema<any, any>> =
  TSchema extends EntitySchema<infer TEntity, any> ? TEntity : never

// TODO: MikroWeaverConfigOptions
