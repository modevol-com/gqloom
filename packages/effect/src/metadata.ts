import type { Schema } from "effect"
import type {
  EnumConfig,
  FieldConfig,
  ObjectConfig,
  UnionConfig,
} from "./types"

/**
 * Symbol for configuring GraphQL object types in Effect Schema.
 */
export const AS_OBJECT_TYPE = Symbol.for("@gqloom/effect/asObjectType")

/**
 * Symbol for configuring GraphQL fields in Effect Schema.
 */
export const AS_FIELD = Symbol.for("@gqloom/effect/asField")

/**
 * Symbol for configuring GraphQL enum types in Effect Schema.
 */
export const AS_ENUM_TYPE = Symbol.for("@gqloom/effect/asEnumType")

/**
 * Symbol for configuring GraphQL union types in Effect Schema.
 */
export const AS_UNION_TYPE = Symbol.for("@gqloom/effect/asUnionType")

// Module augmentation to add type safety to our custom annotations
declare module "effect/Schema" {
  // biome-ignore lint/style/noNamespace: Module augmentation requires namespace
  export namespace Annotations {
    // biome-ignore lint/correctness/noUnusedVariables: Type parameter required for module augmentation
    export interface GenericSchema<A> {
      [AS_OBJECT_TYPE]?: Partial<ObjectConfig>
      [AS_FIELD]?: Partial<FieldConfig>
      [AS_ENUM_TYPE]?: Partial<EnumConfig>
      [AS_UNION_TYPE]?: Partial<UnionConfig>
    }
  }
}

/**
 * Helper function to add object type configuration to an Effect Schema.
 * @param schema Effect Schema
 * @param config Object type configuration
 * @returns Schema with object type configuration
 */
export function asObjectType<A, I, R>(
  schema: Schema.Schema<A, I, R>,
  config: ObjectConfig
): Schema.Schema<A, I, R> {
  return schema.annotations({ [AS_OBJECT_TYPE]: config })
}

/**
 * Helper function to add field configuration to an Effect Schema.
 * @param schema Effect Schema
 * @param config Field configuration
 * @returns Schema with field configuration
 */
export function asField<A, I, R>(
  schema: Schema.Schema<A, I, R>,
  config: FieldConfig
): Schema.Schema<A, I, R> {
  return schema.annotations({ [AS_FIELD]: config })
}

/**
 * Helper function to add enum type configuration to an Effect Schema.
 * @param schema Effect Schema
 * @param config Enum type configuration
 * @returns Schema with enum type configuration
 */
export function asEnumType<A, I, R>(
  schema: Schema.Schema<A, I, R>,
  config: EnumConfig
): Schema.Schema<A, I, R> {
  return schema.annotations({ [AS_ENUM_TYPE]: config })
}

/**
 * Helper function to add union type configuration to an Effect Schema.
 * @param schema Effect Schema
 * @param config Union type configuration
 * @returns Schema with union type configuration
 */
export function asUnionType<A, I, R>(
  schema: Schema.Schema<A, I, R>,
  config: UnionConfig
): Schema.Schema<A, I, R> {
  return schema.annotations({ [AS_UNION_TYPE]: config })
}
