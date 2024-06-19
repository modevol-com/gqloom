import {
  type GraphQLUnionTypeConfig,
  type GraphQLEnumTypeConfig,
  type GraphQLFieldConfig,
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
import { type TypeOrFieldConfig } from "./types"

interface ObjectConfig
  extends Omit<GraphQLObjectTypeConfig<any, any>, "fields" | "interfaces">,
    Partial<Pick<GraphQLObjectTypeConfig<any, any>, "fields">> {
  interfaces?: (ZodObject<ZodRawShape> | GraphQLInterfaceType)[]
}

interface FieldConfig extends Partial<GraphQLFieldConfig<any, any>> {}

// interface ArgumentConfig extends

interface EnumConfig
  extends Omit<GraphQLEnumTypeConfig, "values">,
    Partial<Pick<GraphQLEnumTypeConfig, "values">> {}

interface UnionConfig
  extends Omit<GraphQLUnionTypeConfig<any, any>, "types">,
    Partial<Pick<GraphQLUnionTypeConfig<any, any>, "types">> {}

const CONFIG = Symbol.for("gqloom.config")

export function objectType(
  config: ObjectConfig
): (arg: object, ctx: RefinementCtx) => void {
  return Object.assign(() => {}, { [CONFIG]: config })
}

export function fieldType(
  config: FieldConfig
): (arg: any, ctx: RefinementCtx) => void {
  return Object.assign(() => {}, { [CONFIG]: config })
}

export function enumType(
  config: EnumConfig
): (arg: object, ctx: RefinementCtx) => void {
  return Object.assign(() => {}, { [CONFIG]: config })
}

export function unionType(
  config: UnionConfig
): (arg: object, ctx: RefinementCtx) => void {
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
  return (schema._def.effect.refinement as any)[CONFIG]
}
