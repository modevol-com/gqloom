import {
  type GraphQLUnionTypeConfig,
  type GraphQLEnumTypeConfig,
  type GraphQLFieldConfig,
  type GraphQLObjectTypeConfig,
} from "graphql"
import {
  type ZodSchema,
  type ZodObject,
  type ZodEnum,
  type ZodNativeEnum,
  type ZodUnion,
  type ZodDiscriminatedUnion,
} from "zod"

type ObjectConfig = Omit<GraphQLObjectTypeConfig<any, any>, "fields"> &
  Partial<Pick<GraphQLObjectTypeConfig<any, any>, "fields">>

type FieldConfig = Partial<GraphQLFieldConfig<any, any>>

type EnumConfig = Omit<GraphQLEnumTypeConfig, "values"> &
  Partial<Pick<GraphQLEnumTypeConfig, "values">>

type UnionConfig = Omit<GraphQLUnionTypeConfig<any, any>, "types"> &
  Partial<Pick<GraphQLUnionTypeConfig<any, any>, "types">>

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
