import type { SYMBOLS, WeaverConfig } from "@gqloom/core"
import type * as Schema from "effect/Schema"
import type {
  GraphQLEnumTypeConfig,
  GraphQLEnumValueConfig,
  GraphQLFieldConfig,
  GraphQLInterfaceType,
  GraphQLObjectTypeConfig,
  GraphQLOutputType,
  GraphQLUnionTypeConfig,
} from "graphql"

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

export interface ObjectConfig
  extends Omit<
      GraphQLObjectTypeConfig<any, any>,
      "fields" | "name" | "interfaces"
    >,
    Partial<Pick<GraphQLObjectTypeConfig<any, any>, "fields" | "name">> {
  interfaces?: (Schema.Schema.Any | GraphQLInterfaceType)[]
}

export interface FieldConfig
  extends Partial<Omit<GraphQLFieldConfig<any, any>, "type">> {
  type?: GraphQLOutputType | undefined | null | typeof SYMBOLS.FIELD_HIDDEN
}

export interface EnumConfig<TKey = string>
  extends Partial<GraphQLEnumTypeConfig> {
  valuesConfig?: TKey extends string
    ? Partial<Record<TKey, GraphQLEnumValueConfig>>
    : Partial<Record<string, GraphQLEnumValueConfig>>
}

export interface UnionConfig
  extends Omit<GraphQLUnionTypeConfig<any, any>, "types">,
    Partial<Pick<GraphQLUnionTypeConfig<any, any>, "types">> {}

export interface EffectWeaverConfigOptions {
  presetGraphQLType?: (
    schema: Schema.Schema.Any
  ) => GraphQLOutputType | undefined
}

export interface EffectWeaverConfig
  extends WeaverConfig,
    EffectWeaverConfigOptions {
  [SYMBOLS.WEAVER_CONFIG]: "gqloom.effect"
}
