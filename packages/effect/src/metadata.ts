import type {
  EnumConfig,
  FieldConfig,
  ObjectConfig,
  UnionConfig,
} from "./types"

/**
 * Symbol for configuring GraphQL object types in Effect Schema.
 */
export const asObjectType = Symbol.for("@gqloom/effect/asObjectType")

/**
 * Symbol for configuring GraphQL fields in Effect Schema.
 */
export const asField = Symbol.for("@gqloom/effect/asField")

/**
 * Symbol for configuring GraphQL enum types in Effect Schema.
 */
export const asEnumType = Symbol.for("@gqloom/effect/asEnumType")

/**
 * Symbol for configuring GraphQL union types in Effect Schema.
 */
export const asUnionType = Symbol.for("@gqloom/effect/asUnionType")

// Module augmentation to add type safety to our custom annotations
declare module "effect/Schema" {
  // biome-ignore lint/style/noNamespace: Module augmentation requires namespace
  export namespace Annotations {
    // biome-ignore lint/correctness/noUnusedVariables: Type parameter required for module augmentation
    export interface GenericSchema<A> {
      asObjectType?: Partial<ObjectConfig>
      [asObjectType]?: Partial<ObjectConfig>
      asField?: Partial<FieldConfig>
      [asField]?: Partial<FieldConfig>
      asEnumType?: Partial<EnumConfig>
      [asEnumType]?: Partial<EnumConfig>
      asUnionType?: Partial<UnionConfig>
      [asUnionType]?: Partial<UnionConfig>
    }
  }
}
