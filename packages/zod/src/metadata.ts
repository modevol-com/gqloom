import { type RefinementCtx, type Schema, ZodEffects } from "zod"
import type {
  EnumConfig,
  FieldConfig,
  ObjectConfig,
  TypeOrFieldConfig,
  UnionConfig,
} from "./types"

const CONFIG = Symbol.for("gqloom.zod.config")

/**
 * Register as a GraphQL object type.
 *
 * @param config - The GraphQL object config.
 *
 * @returns zod superRefine refinement.
 */
export function asObjectType(
  config: ObjectConfig
): (arg: object, ctx: RefinementCtx) => void

/**
 * Register as a GraphQL object type.
 *
 * @param name - The GraphQL object name.
 *
 * @returns zod superRefine refinement.
 */
export function asObjectType(
  name: string
): (arg: object, ctx: RefinementCtx) => void
export function asObjectType(
  configOrName: ObjectConfig | string
): (arg: object, ctx: RefinementCtx) => void {
  const config: ObjectConfig =
    typeof configOrName === "string" ? { name: configOrName } : configOrName
  return Object.assign(() => void 0, {
    [CONFIG]: config,
  })
}

/**
 * Register as a GraphQL field.
 *
 * @param config - The GraphQL field config.
 *
 * @return zod superRefine refinement.
 */
export function asField(
  config: FieldConfig
): (arg: any, ctx: RefinementCtx) => void {
  return Object.assign(() => void 0, {
    [CONFIG]: config,
  })
}

/**
 * Register as a GraphQL enum type.
 *
 * @param config - The GraphQL enum config.
 *
 * @return zod superRefine refinement.
 */
export function asEnumType<TArg>(
  config: EnumConfig<TArg>
): (arg: TArg, ctx: RefinementCtx) => void
/**
 * Register as a GraphQL enum type.
 *
 * @param name - The GraphQL enum name.
 *
 * @return zod superRefine refinement.
 */
export function asEnumType(name: string): (arg: any, ctx: RefinementCtx) => void

export function asEnumType(
  configOrName: EnumConfig | string
): (arg: any, ctx: RefinementCtx) => void {
  const config: EnumConfig =
    typeof configOrName === "string" ? { name: configOrName } : configOrName
  return Object.assign(() => void 0, { [CONFIG]: config })
}

/**
 * Register as a GraphQL union type.
 *
 * @param config - The GraphQL union config.
 *
 * @return zod superRefine refinement.
 */
export function asUnionType(
  config: UnionConfig
): (arg: object, ctx: RefinementCtx) => void

/**
 * Register as a GraphQL union type.
 *
 * @param name - The GraphQL union name.
 *
 * @return zod superRefine refinement.
 */
export function asUnionType(
  name: string
): (arg: object, ctx: RefinementCtx) => void

export function asUnionType(
  configOrName: UnionConfig | string
): (arg: object, ctx: RefinementCtx) => void {
  const config: UnionConfig =
    typeof configOrName === "string" ? { name: configOrName } : configOrName
  return Object.assign(() => void 0, { [CONFIG]: config })
}

/**
 * Get configuration object from ZodEffects schema
 * @param refinement Refinement function in ZodEffects
 * @returns Configuration object.
 */
export function getConfig(schema: Schema): TypeOrFieldConfig | undefined {
  if (!(schema instanceof ZodEffects)) return
  if (schema._def.effect.type !== "refinement") return
  const config = (schema._def.effect.refinement as any)[CONFIG]
  const description = schema.description
  return { ...(description && { description }), ...config }
}
