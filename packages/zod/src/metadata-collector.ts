import {
  type GraphQLUnionTypeConfig,
  type GraphQLEnumTypeConfig,
  type GraphQLFieldConfig,
  type GraphQLObjectTypeConfig,
  type GraphQLInterfaceType,
} from "graphql"
import {
  type ZodSchema,
  type ZodObject,
  type ZodEnum,
  type ZodNativeEnum,
  type ZodUnion,
  type ZodDiscriminatedUnion,
  type ZodRawShape,
} from "zod"

interface ObjectConfig
  extends Omit<GraphQLObjectTypeConfig<any, any>, "fields" | "interfaces">,
    Partial<Pick<GraphQLObjectTypeConfig<any, any>, "fields">> {
  interfaces?: (ZodObject<ZodRawShape> | GraphQLInterfaceType)[]
}

interface FieldConfig extends Partial<GraphQLFieldConfig<any, any>> {}

interface EnumConfig
  extends Omit<GraphQLEnumTypeConfig, "values">,
    Partial<Pick<GraphQLEnumTypeConfig, "values">> {}

interface UnionConfig
  extends Omit<GraphQLUnionTypeConfig<any, any>, "types">,
    Partial<Pick<GraphQLUnionTypeConfig<any, any>, "types">> {}

export function objectType<T extends ZodObject<any>>(
  config: ObjectConfig,
  schema: T
): T {
  metadataCollector.objects.set(schema, config)
  return schema
}

export function fieldType<T extends ZodSchema>(
  config: FieldConfig,
  schema: T
): T {
  metadataCollector.fields.set(schema, config)
  return schema
}

export function enumType<T extends ZodEnum<any> | ZodNativeEnum<any>>(
  config: EnumConfig,
  schema: T
): T {
  metadataCollector.enums.set(schema, config)
  return schema
}

export function unionType<
  T extends ZodUnion<any> | ZodDiscriminatedUnion<any, any>,
>(config: UnionConfig, schema: T): T {
  metadataCollector.unions.set(schema, config)
  return schema
}

export const metadataCollector = {
  objects: new WeakMap<ZodObject<any>, ObjectConfig>(),
  fields: new WeakMap<ZodSchema, FieldConfig>(),
  enums: new WeakMap<ZodEnum<any> | ZodNativeEnum<any>, EnumConfig>(),
  unions: new WeakMap<
    ZodUnion<any> | ZodDiscriminatedUnion<any, any>,
    UnionConfig
  >(),
}
