import {
  type GraphQLSilk,
  createLoom,
  mapValue,
  ensureInterfaceType,
  weaverContext,
} from "@gqloom/core"
import {
  type GraphQLOutputType,
  GraphQLString,
  GraphQLFloat,
  GraphQLInt,
  GraphQLID,
  GraphQLBoolean,
  GraphQLNonNull,
  isNonNullType,
  GraphQLList,
  GraphQLObjectType,
  GraphQLEnumType,
  type GraphQLEnumValueConfigMap,
  GraphQLUnionType,
  isObjectType,
  type GraphQLObjectTypeConfig,
  type GraphQLEnumTypeConfig,
  type GraphQLUnionTypeConfig,
  type GraphQLFieldConfig,
  type GraphQLInterfaceType,
  isInterfaceType,
  isUnionType,
  isEnumType,
} from "graphql"
import {
  ZodArray,
  ZodBoolean,
  ZodDate,
  ZodNullable,
  ZodNumber,
  ZodObject,
  ZodOptional,
  type ZodRawShape,
  ZodString,
  ZodType,
  type Schema,
  type input,
  type output,
  ZodEnum,
  ZodNativeEnum,
  type EnumLike,
  ZodUnion,
  type ZodTypeAny,
  ZodDiscriminatedUnion,
  ZodLiteral,
  type ZodSchema,
} from "zod"
import { ZodIDKinds } from "./constants"
import {
  resolveTypeByDiscriminatedUnion,
  parseObjectConfig,
  parseFieldConfig,
} from "./utils"
import { metadataCollector } from "./metadata-collector"

export * from "./metadata-collector"

export class ZodSilk<TSchema extends Schema>
  implements GraphQLSilk<output<TSchema>, input<TSchema>>
{
  _types?: { input: input<TSchema>; output: output<TSchema> }
  constructor(public schema: TSchema) {}

  getGraphQLType() {
    return ZodSilk.toNullableGraphQLType(this.schema)
  }

  static toNullableGraphQLType(schema: Schema): GraphQLOutputType {
    const nullable = (ofType: GraphQLOutputType) => {
      const isNonNull = !schema.isNullable() && !schema.isOptional()
      if (!isNonNull) return ofType
      if (isNonNullType(ofType)) return ofType
      return new GraphQLNonNull(ofType)
    }

    const gqlType = ZodSilk.toGraphQLType(schema)

    // do not forget to keep the type
    if (isObjectType(gqlType)) {
      weaverContext.objectMap?.set(gqlType.name, gqlType)
    } else if (isUnionType(gqlType)) {
      weaverContext.unionMap?.set(gqlType.name, gqlType)
    } else if (isEnumType(gqlType)) {
      weaverContext.enumMap?.set(gqlType.name, gqlType)
    }
    return nullable(gqlType)
  }

  static toGraphQLType(schema: Schema): GraphQLOutputType {
    if (schema instanceof ZodOptional || schema instanceof ZodNullable) {
      return ZodSilk.toGraphQLType(schema.unwrap())
    }

    if (schema instanceof ZodArray) {
      return new GraphQLList(ZodSilk.toNullableGraphQLType(schema.element))
    }

    if (schema instanceof ZodString) {
      if (schema._def.checks.some((ch) => ZodIDKinds.has(ch.kind)))
        return GraphQLID
      return GraphQLString
    }

    if (schema instanceof ZodLiteral) {
      return GraphQLString
    }

    if (schema instanceof ZodNumber) {
      if (schema.isInt) return GraphQLInt
      return GraphQLFloat
    }

    if (schema instanceof ZodBoolean) {
      return GraphQLBoolean
    }

    if (schema instanceof ZodDate) {
      return GraphQLString
    }

    if (schema instanceof ZodObject) {
      const { name, ...config } = ZodSilk.getObjectConfig(schema)
      if (!name) throw new Error("Object must have a name")

      const existing = weaverContext.objectMap?.get(name)
      if (existing) return existing

      return new GraphQLObjectType({
        name,
        fields: mapValue(schema.shape as ZodRawShape, (field) => {
          return {
            type: ZodSilk.toNullableGraphQLType(field),
            ...ZodSilk.getFieldConfig(field),
          }
        }),
        ...config,
      })
    }

    if (schema instanceof ZodEnum || schema instanceof ZodNativeEnum) {
      const { name, ...config } = ZodSilk.getEnumConfig(schema)
      if (!name) throw new Error("Enum must have a name")

      const existing = weaverContext.enumMap?.get(name)
      if (existing) return existing

      const values: GraphQLEnumValueConfigMap = {}

      if ("options" in schema) {
        for (const value of schema.options as string[]) {
          values[value] = { value }
        }
      } else {
        Object.entries(schema.enum as EnumLike).forEach(([key, value]) => {
          if (typeof schema.enum?.[schema.enum[key]] === "number") return
          values[key] = { value }
        })
      }

      return new GraphQLEnumType({ name, values, ...config })
    }

    if (schema instanceof ZodUnion || schema instanceof ZodDiscriminatedUnion) {
      const { name, ...config } = ZodSilk.getUnionConfig(schema)
      if (!name) throw new Error("Enum must have a name")

      const existing = weaverContext.unionMap?.get(name)
      if (existing) return existing

      const types = (schema.options as ZodTypeAny[]).map((s) => {
        const gqlType = ZodSilk.toGraphQLType(s)
        if (isObjectType(gqlType)) return gqlType
        throw new Error(
          `Union types ${name} can only contain objects, but got ${gqlType}`
        )
      })

      return new GraphQLUnionType({
        resolveType:
          schema instanceof ZodDiscriminatedUnion
            ? resolveTypeByDiscriminatedUnion(schema)
            : undefined,
        types,
        name,
        ...config,
      })
    }

    throw new Error(`zod type ${schema.constructor.name} is not supported`)
  }

  protected static getObjectConfig(
    schema: ZodObject<any>
  ): Partial<GraphQLObjectTypeConfig<any, any>> {
    const fromMetadata = metadataCollector.objects.get(schema)
    const fromDescription = schema.description
      ? parseObjectConfig(schema.description)
      : undefined
    const interfaces = fromMetadata?.interfaces?.map(
      ZodSilk.ensureInterfaceType
    )
    return { ...fromMetadata, ...fromDescription, interfaces }
  }

  protected static ensureInterfaceType(
    item: GraphQLInterfaceType | ZodObject<any>
  ): GraphQLInterfaceType {
    if (isInterfaceType(item)) return item
    const gqlType = ZodSilk.toGraphQLType(item)

    return ensureInterfaceType(gqlType)
  }

  protected static getEnumConfig(
    schema: ZodEnum<any> | ZodNativeEnum<any>
  ): Partial<GraphQLEnumTypeConfig> {
    const fromMetadata = metadataCollector.enums.get(schema)
    const fromDescription = schema.description
      ? parseObjectConfig(schema.description)
      : undefined
    return { ...fromMetadata, ...fromDescription }
  }

  protected static getUnionConfig(
    schema: ZodDiscriminatedUnion<any, any> | ZodUnion<any>
  ): Partial<GraphQLUnionTypeConfig<any, any>> {
    const fromMetadata = metadataCollector.unions.get(schema)
    const fromDescription = schema.description
      ? parseObjectConfig(schema.description)
      : undefined
    return { ...fromMetadata, ...fromDescription }
  }

  protected static getFieldConfig(
    schema: ZodSchema
  ): Partial<GraphQLFieldConfig<any, any>> {
    const fromMetadata = metadataCollector.fields.get(schema)
    const fromDescription = schema.description
      ? schema instanceof ZodObject
        ? parseObjectConfig(schema.description)
        : parseFieldConfig(schema.description)
      : undefined
    return { ...fromMetadata, ...fromDescription }
  }

  parse(input: input<TSchema>): Promise<output<TSchema>> {
    return this.schema.parseAsync(input)
  }
}

export type ZodSchemaIO = [Schema, "_input", "_output"]

export function zodSilk<TSchema extends Schema>(
  schema: TSchema
): ZodSilk<TSchema> {
  return new ZodSilk(schema)
}

export const { query, mutation, field, resolver } = createLoom<ZodSchemaIO>(
  zodSilk,
  isZodSchema
)

function isZodSchema(target: any): target is Schema {
  return target instanceof ZodType
}
