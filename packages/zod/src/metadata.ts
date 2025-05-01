import * as z from "@zod/core"
import type {
  EnumConfig,
  FieldConfig,
  ObjectConfig,
  UnionConfig,
} from "./types"

/**
 * A registry to configure GraphQL object types.
 */
export const asObjectType = z.registry<ObjectConfig>()

/**
 * A registry to configure GraphQL fields.
 */
export const asField = z.registry<FieldConfig>()

/**
 * A registry to configure GraphQL enum types.
 */
export const asEnumType = z.registry<EnumConfig>()

/**
 * A registry to configure GraphQL union types.
 */
export const asUnionType = z.registry<UnionConfig>()
