import {
  type GraphQLUnionTypeConfig,
  type GraphQLEnumTypeConfig,
  type GraphQLObjectTypeConfig,
  type GraphQLInterfaceType,
} from "graphql"
import {
  ZodEffects,
  type RefinementCtx,
  type ZodObject,
  type ZodRawShape,
  type Schema,
} from "zod"
import { type FieldConfig, type TypeOrFieldConfig } from "./types"

interface ObjectConfig
  extends Partial<
    Omit<GraphQLObjectTypeConfig<any, any>, "fields" | "interfaces">
  > {
  interfaces?: (ZodObject<ZodRawShape> | GraphQLInterfaceType)[]
}

// interface ArgumentConfig extends

interface EnumConfig
  extends Omit<GraphQLEnumTypeConfig, "values">,
    Partial<Pick<GraphQLEnumTypeConfig, "values">> {}

interface UnionConfig
  extends Omit<GraphQLUnionTypeConfig<any, any>, "types">,
    Partial<Pick<GraphQLUnionTypeConfig<any, any>, "types">> {}

const CONFIG = Symbol.for("gqloom.zod.config")

/**
 * Register as a GraphQL object type.
 *
 * @param config - The GraphQL object config.
 *
 * @returns zod superRefine refinement
 */
export function asObjectType(
  config: ObjectConfig
): (arg: object, ctx: RefinementCtx) => void

/**
 * Register as a GraphQL object type.
 *
 * @param name - The GraphQL object name.
 *
 * @returns zod superRefine refinement
 */
export function asObjectType(
  name: string
): (arg: object, ctx: RefinementCtx) => void
export function asObjectType(
  configOrName: ObjectConfig | string
): (arg: object, ctx: RefinementCtx) => void {
  const config: ObjectConfig =
    typeof configOrName === "string" ? { name: configOrName } : configOrName
  return Object.assign(() => {}, {
    [CONFIG]: config,
  })
}

/**
 * Register as a GraphQL field.
 *
 * @param config - The GraphQL field config.
 *
 * @return zod superRefine refinement
 */
export function asField(
  config: FieldConfig
): (arg: any, ctx: RefinementCtx) => void {
  return Object.assign(() => {}, {
    [CONFIG]: config,
  })
}

/**
 * Register as a GraphQL enum type.
 *
 * @param config - The GraphQL enum config.
 *
 * @return zod superRefine refinement
 */
export function asEnumType(
  config: EnumConfig
): (arg: any, ctx: RefinementCtx) => void
/**
 * Register as a GraphQL enum type.
 *
 * @param name - The GraphQL enum name.
 *
 * @return zod superRefine refinement
 */
export function asEnumType(name: string): (arg: any, ctx: RefinementCtx) => void

export function asEnumType(
  configOrName: EnumConfig | string
): (arg: any, ctx: RefinementCtx) => void {
  const config: EnumConfig =
    typeof configOrName === "string" ? { name: configOrName } : configOrName
  return Object.assign(() => {}, { [CONFIG]: config })
}

/**
 * Register as a GraphQL union type.
 *
 * @param config - The GraphQL union config.
 *
 * @return zod superRefine refinement
 */
export function asUnionType(
  config: UnionConfig
): (arg: object, ctx: RefinementCtx) => void

/**
 * Register as a GraphQL union type.
 *
 * @param name - The GraphQL union name.
 *
 * @return zod superRefine refinement
 */
export function asUnionType(
  name: string
): (arg: object, ctx: RefinementCtx) => void

export function asUnionType(
  configOrName: UnionConfig | string
): (arg: object, ctx: RefinementCtx) => void {
  const config: UnionConfig =
    typeof configOrName === "string" ? { name: configOrName } : configOrName
  return Object.assign(() => {}, { [CONFIG]: config })
}

/**
 * Get configuration object from ZodEffects schema
 * @param refinement Refinement function in ZodEffects
 * @returns Configuration object
 */
export function getConfig(schema: Schema): TypeOrFieldConfig | undefined {
  if (!(schema instanceof ZodEffects)) return
  if (schema._def.effect.type !== "refinement") return
  const config = (schema._def.effect.refinement as any)[CONFIG]
  const description = schema.description
  return { ...(description && { description }), ...config }
}
