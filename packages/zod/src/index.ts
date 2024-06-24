import {
  type GraphQLSilk,
  createLoom,
  mapValue,
  ensureInterfaceType,
  weaverContext,
  SYMBOLS,
  deepMerge,
  type GQLoomExtensions,
  mergeExtensions,
  initWeaverContext,
  provideWeaverContext,
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
  type GraphQLInterfaceType,
  isInterfaceType,
  type GraphQLEnumTypeConfig,
  type GraphQLObjectTypeConfig,
  type GraphQLUnionTypeConfig,
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
  ZodDefault,
  ZodEffects,
  type ZodSchema,
} from "zod"
import { ZodIDKinds, parseFieldConfig, parseObjectConfig } from "./utils"
import { resolveTypeByDiscriminatedUnion } from "./utils"
// import { metadataCollector } from "./metadata-collector"
import {
  type UnionConfig,
  type FieldConfig,
  type TypeOrFieldConfig,
  type EnumConfig,
  type ObjectConfig,
  type ZodWeaverConfigOptions,
  type ZodWeaverConfig,
} from "./types"
import { getConfig } from "./metadata"

export * from "./metadata"

export class ZodWeaver {
  /**
   * get GraphQL Silk from Zod Schema
   * @param schema Zod Schema
   * @returns GraphQL Silk Like Zod Schema
   */
  static unravel<TSchema extends Schema>(
    schema: TSchema
  ): TSchema & GraphQLSilk<output<TSchema>, input<TSchema>> {
    return Object.assign(schema, {
      [SYMBOLS.GET_GRAPHQL_TYPE]: getGraphQLType,
      [SYMBOLS.PARSE]: parseZod,
    })
  }

  static toNullableGraphQLType(schema: Schema): GraphQLOutputType {
    const nullable = (ofType: GraphQLOutputType) => {
      const isNonNull = !schema.isNullable() && !schema.isOptional()
      if (!isNonNull) return ofType
      if (isNonNullType(ofType)) return ofType
      return new GraphQLNonNull(ofType)
    }

    const gqlType = ZodWeaver.toGraphQLType(schema)

    weaverContext.memo(gqlType)
    return nullable(gqlType)
  }

  static toGraphQLType(
    schema: Schema,
    config?: TypeOrFieldConfig
  ): GraphQLOutputType {
    const customType = (config as FieldConfig | undefined)?.type
    if (customType) return customType

    const preset = weaverContext.getConfig<ZodWeaverConfig>("gqloom.zod")
    const presetType = preset?.presetGraphQLType?.(schema)
    if (presetType) return presetType

    if (schema instanceof ZodEffects) {
      config ??= getConfig(schema)
      return ZodWeaver.toGraphQLType(schema.innerType(), config)
    }

    if (schema instanceof ZodOptional || schema instanceof ZodNullable) {
      return ZodWeaver.toGraphQLType(schema.unwrap(), config)
    }

    if (schema instanceof ZodDefault) {
      return ZodWeaver.toGraphQLType(
        schema._def.innerType,
        deepMerge(config, {
          extensions: { defaultValue: schema._def.defaultValue },
        })
      )
    }

    if (schema instanceof ZodArray) {
      return new GraphQLList(ZodWeaver.toNullableGraphQLType(schema.element))
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
      const { name, ...objectConfig } = ZodWeaver.getObjectConfig(
        schema,
        config
      )
      if (!name) throw new Error("Object must have a name")

      const existing = weaverContext.objectMap?.get(name)
      if (existing) return existing

      const strictSchema = schema.strict()

      return new GraphQLObjectType({
        name,
        fields: mapValue(schema.shape as ZodRawShape, (field, key) => {
          if (key.startsWith("__")) return mapValue.SKIP
          const { type, ...fieldConfig } = ZodWeaver.getFieldConfig(field)
          if (type === null) return mapValue.SKIP
          return {
            type: type ?? ZodWeaver.toNullableGraphQLType(field),
            ...fieldConfig,
          }
        }),
        isTypeOf: (input) =>
          strictSchema.safeParseAsync(input).then((it) => it.success),
        ...objectConfig,
      })
    }

    if (schema instanceof ZodEnum || schema instanceof ZodNativeEnum) {
      const { name, ...enumConfig } = ZodWeaver.getEnumConfig(schema)
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

      return new GraphQLEnumType({
        name,
        values,
        ...enumConfig,
      })
    }

    if (schema instanceof ZodUnion || schema instanceof ZodDiscriminatedUnion) {
      const { name, ...unionConfig } = ZodWeaver.getUnionConfig(schema, config)
      if (!name) throw new Error("Enum must have a name")

      const existing = weaverContext.unionMap?.get(name)
      if (existing) return existing

      const types = (schema.options as ZodTypeAny[]).map((s) => {
        const gqlType = ZodWeaver.toGraphQLType(s)
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
        ...unionConfig,
      })
    }

    throw new Error(`zod type ${schema.constructor.name} is not supported`)
  }

  protected static getObjectConfig(
    schema: ZodObject<any>,
    config?: TypeOrFieldConfig
  ): Partial<GraphQLObjectTypeConfig<any, any>> {
    const objectConfig = config as ObjectConfig | undefined
    const fromDescription = schema.description
      ? parseObjectConfig(schema.description)
      : undefined
    const interfaces = objectConfig?.interfaces?.map(
      ZodWeaver.ensureInterfaceType
    )
    return {
      name: weaverContext.names.get(schema),
      ...objectConfig,
      ...fromDescription,
      interfaces,
      extensions: mergeExtensions(
        objectConfig?.extensions,
        fromDescription?.extensions
      ),
    }
  }

  protected static ensureInterfaceType(
    item: GraphQLInterfaceType | ZodObject<any>
  ): GraphQLInterfaceType {
    if (isInterfaceType(item)) return item
    const gqlType = weaverContext.memo(ZodWeaver.toGraphQLType(item))

    return ensureInterfaceType(gqlType)
  }

  protected static getEnumConfig(
    schema: ZodEnum<any> | ZodNativeEnum<any>,
    config?: TypeOrFieldConfig
  ): Partial<GraphQLEnumTypeConfig> {
    const enumConfig = config as EnumConfig | undefined

    const fromDescription = schema.description
      ? parseObjectConfig(schema.description)
      : undefined
    return {
      name: weaverContext.names.get(schema),
      ...enumConfig,
      ...fromDescription,
      extensions: mergeExtensions(
        enumConfig?.extensions,
        fromDescription?.extensions
      ),
    }
  }

  protected static getUnionConfig(
    schema: ZodDiscriminatedUnion<any, any> | ZodUnion<any>,
    config?: TypeOrFieldConfig
  ): Partial<GraphQLUnionTypeConfig<any, any>> {
    const unionConfig = config as UnionConfig | undefined
    const fromDescription = schema.description
      ? parseObjectConfig(schema.description)
      : undefined
    return {
      name: weaverContext.names.get(schema),
      ...unionConfig,
      ...fromDescription,
      extensions: mergeExtensions(
        unionConfig?.extensions,
        fromDescription?.extensions
      ),
    }
  }

  protected static getFieldConfig(schema: ZodSchema): FieldConfig {
    const fromDefault = (() => {
      if (schema instanceof ZodDefault) {
        return {
          defaultValue: schema._def.defaultValue,
        } as GQLoomExtensions
      }
    })()
    const config = getConfig(schema) as FieldConfig | undefined
    const fromDescription = schema.description
      ? schema instanceof ZodObject
        ? parseObjectConfig(schema.description)
        : parseFieldConfig(schema.description)
      : undefined
    return {
      ...fromDescription,
      ...config,
      extensions: mergeExtensions(
        fromDefault,
        fromDescription?.extensions,
        config?.extensions
      ),
    }
  }

  /**
   * Create a Zod weaver config object
   * @param config Zod weaver config options
   * @returns a Zod weaver config object
   */
  static config = function (config: ZodWeaverConfigOptions): ZodWeaverConfig {
    return {
      ...config,
      [SYMBOLS.WEAVER_CONFIG]: "gqloom.zod",
    }
  }

  /**
   * Use a Zod weaver config
   * @param config Zod weaver config options
   * @returns a new Zod to silk function
   */
  static useConfig = function (
    config: ZodWeaverConfigOptions
  ): typeof ZodWeaver.unravel {
    const context = weaverContext.value ?? initWeaverContext()
    context.setConfig<ZodWeaverConfig>({
      ...config,
      [SYMBOLS.WEAVER_CONFIG]: "gqloom.zod",
    })
    return (schema) =>
      provideWeaverContext(() => ZodWeaver.unravel(schema), context)
  }
}

/**
 * get GraphQL Silk from Zod Schema
 * @param schema Zod Schema
 * @returns GraphQL Silk Like Zod Schema
 */
export const zodSilk = ZodWeaver.unravel

export type ZodSchemaIO = [Schema, "_input", "_output"]

// TODO: created Loom should accept GraphQLSilk
export const { query, mutation, field, resolver } = createLoom<ZodSchemaIO>(
  zodSilk,
  isZodSchema
)

function isZodSchema(target: any): target is Schema {
  return target instanceof ZodType
}

function getGraphQLType(this: Schema) {
  return ZodWeaver.toNullableGraphQLType(this)
}

function parseZod(this: Schema, data: any) {
  return this.parseAsync(data)
}
