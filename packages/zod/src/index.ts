import {
  type GQLoomExtensions,
  type GraphQLSilk,
  SYMBOLS,
  deepMerge,
  ensureInterfaceType,
  mapValue,
  weave,
  weaverContext,
} from "@gqloom/core"
import { LoomObjectType } from "@gqloom/core"
import {
  GraphQLBoolean,
  GraphQLEnumType,
  type GraphQLEnumValueConfigMap,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  type GraphQLInterfaceType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  type GraphQLObjectTypeConfig,
  type GraphQLObjectTypeExtensions,
  type GraphQLOutputType,
  GraphQLString,
  GraphQLUnionType,
  type GraphQLUnionTypeConfig,
  isInterfaceType,
  isNonNullType,
  isObjectType,
} from "graphql"
import {
  type EnumLike,
  type Schema,
  ZodArray,
  ZodBoolean,
  ZodDate,
  ZodDefault,
  ZodDiscriminatedUnion,
  type ZodDiscriminatedUnionOption,
  ZodEffects,
  ZodEnum,
  ZodLiteral,
  ZodNativeEnum,
  ZodNullable,
  ZodNumber,
  ZodObject,
  ZodOptional,
  type ZodRawShape,
  type ZodSchema,
  ZodString,
  type ZodTypeAny,
  ZodUnion,
  type z,
} from "zod"
import { getConfig } from "./metadata"
// import { metadataCollector } from "./metadata-collector"
import type {
  EnumConfig,
  FieldConfig,
  ObjectConfig,
  TypeOrFieldConfig,
  UnionConfig,
  ZodWeaverConfig,
  ZodWeaverConfigOptions,
} from "./types"
import { ZodIDKinds } from "./utils"
import { resolveTypeByDiscriminatedUnion } from "./utils"

export class ZodWeaver {
  public static vendor = "zod"
  /**
   * get GraphQL Silk from Zod Schema
   * @param schema Zod Schema
   * @returns GraphQL Silk Like Zod Schema
   */
  public static unravel<TSchema extends Schema>(
    schema: TSchema
  ): TSchema & GraphQLSilk<z.output<TSchema>, z.input<TSchema>> {
    const config = weaverContext.value?.getConfig<ZodWeaverConfig>("gqloom.zod")
    return Object.assign(schema, {
      [SYMBOLS.GET_GRAPHQL_TYPE]: config
        ? function (this: Schema) {
            return weaverContext.useConfig(config, () =>
              ZodWeaver.getGraphQLTypeBySelf.call(this)
            )
          }
        : ZodWeaver.getGraphQLTypeBySelf,
    })
  }

  /**
   * Weave a GraphQL Schema from resolvers with zod schema
   * @param inputs Resolvers, Global Middlewares, WeaverConfigs Or SchemaWeaver
   * @returns GraphQL Schema
   */
  public static weave(...inputs: Parameters<typeof weave>) {
    return weave(ZodWeaver, ...inputs)
  }

  protected static toNullableGraphQLType(schema: Schema): GraphQLOutputType {
    const nullable = (ofType: GraphQLOutputType) => {
      let isNonNull = !schema.isNullable() && !schema.isOptional()
      if ("coerce" in schema._def && schema._def.coerce === true) {
        isNonNull = !schema.isOptional()
      }
      if (!isNonNull) return ofType
      if (isNonNullType(ofType)) return ofType
      return new GraphQLNonNull(ofType)
    }

    const gqlType = ZodWeaver.toGraphQLType(schema)

    return nullable(gqlType)
  }

  protected static toGraphQLType(
    schema: Schema,
    config?: TypeOrFieldConfig
  ): GraphQLOutputType {
    const existing = weaverContext.getGraphQLType(schema)
    if (existing) return existing
    const gqlType = ZodWeaver.toGraphQLTypePurely(schema, config)
    return weaverContext.memoGraphQLType(schema, gqlType)
  }

  protected static toGraphQLTypePurely(
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
      switch (typeof schema.value) {
        case "boolean":
          return GraphQLBoolean
        case "number":
          return GraphQLFloat
        case "string":
        default:
          return GraphQLString
      }
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
      const { name = LoomObjectType.AUTO_ALIASING, ...objectConfig } =
        ZodWeaver.getObjectConfig(schema, config)

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
        ...objectConfig,
      })
    }

    if (schema instanceof ZodEnum || schema instanceof ZodNativeEnum) {
      const { name, valuesConfig, ...enumConfig } = ZodWeaver.getEnumConfig(
        schema,
        config
      )

      const values: GraphQLEnumValueConfigMap = {}

      if ("options" in schema) {
        for (const value of schema.options) {
          const key = String(value)
          values[key] = { value, ...valuesConfig?.[key] }
        }
      } else {
        Object.entries(schema.enum as EnumLike).forEach(([key, value]) => {
          if (typeof schema.enum?.[schema.enum[key]] === "number") return
          values[key] = { value, ...valuesConfig?.[key] }
        })
      }

      if (!name)
        throw new Error(
          `Enum (${Object.keys(values).join(", ")}) must have a name`
        )

      return new GraphQLEnumType({
        name,
        values,
        ...enumConfig,
      })
    }

    if (schema instanceof ZodUnion || schema instanceof ZodDiscriminatedUnion) {
      const { name, ...unionConfig } = ZodWeaver.getUnionConfig(schema, config)

      const types = (schema.options as ZodTypeAny[]).map((s) => {
        const gqlType = ZodWeaver.toGraphQLType(s)
        if (isObjectType(gqlType)) return gqlType
        throw new Error(
          `Union types ${name ?? "(unnamed)"} can only contain objects, but got ${gqlType}`
        )
      })

      if (!name)
        throw new Error(
          `Union (${types.map((t) => t.name).join(", ")}) must have a name`
        )

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
    const interfaces = objectConfig?.interfaces?.map(
      ZodWeaver.ensureInterfaceType
    )

    const name = (() => {
      if ("__typename" in schema.shape) {
        let __typename = schema.shape["__typename"]
        while (
          __typename instanceof ZodOptional ||
          __typename instanceof ZodNullable
        ) {
          __typename = __typename.unwrap()
        }
        if (__typename instanceof ZodLiteral) {
          return __typename.value as string
        }
      }
      return weaverContext.names.get(schema)
    })()

    return {
      name,
      description: schema.description,
      ...objectConfig,
      interfaces,
      extensions: deepMerge(
        objectConfig?.extensions
      ) as GraphQLObjectTypeExtensions,
    }
  }

  public static getDiscriminatedUnionOptionName(
    option: ZodDiscriminatedUnionOption<any> | undefined,
    config?: TypeOrFieldConfig
  ): string | undefined {
    if (option instanceof ZodEffects) {
      config ??= getConfig(option)
      return ZodWeaver.getDiscriminatedUnionOptionName(option, config)
    }
    const { name } = ZodWeaver.getObjectConfig(option as ZodObject<any>, config)
    return name
  }

  protected static ensureInterfaceType(
    item: GraphQLInterfaceType | ZodObject<any>
  ): GraphQLInterfaceType {
    if (isInterfaceType(item)) return item
    const gqlType = ZodWeaver.toGraphQLType(item)

    return ensureInterfaceType(gqlType)
  }

  protected static getEnumConfig(
    schema: ZodEnum<any> | ZodNativeEnum<any>,
    config?: TypeOrFieldConfig
  ): EnumConfig {
    const enumConfig = config as EnumConfig | undefined

    return {
      name: weaverContext.names.get(schema),
      description: schema.description,
      ...enumConfig,
      extensions: deepMerge(enumConfig?.extensions),
    }
  }

  protected static getUnionConfig(
    schema: ZodDiscriminatedUnion<any, any> | ZodUnion<any>,
    config?: TypeOrFieldConfig
  ): Partial<GraphQLUnionTypeConfig<any, any>> {
    const unionConfig = config as UnionConfig | undefined
    return {
      name: weaverContext.names.get(schema),
      ...unionConfig,
      description: schema.description,
      extensions: deepMerge(unionConfig?.extensions),
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
    return {
      description: schema.description,
      ...config,
      extensions: deepMerge(
        fromDefault,
        config?.extensions
      ) as GraphQLObjectTypeExtensions,
    }
  }

  /**
   * Create a Zod weaver config object
   * @param config Zod weaver config options
   * @returns a Zod weaver config object
   */
  public static config = function (
    config: ZodWeaverConfigOptions
  ): ZodWeaverConfig {
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
  public static useConfig = function (
    config: ZodWeaverConfigOptions
  ): typeof ZodWeaver.unravel {
    return (schema) =>
      weaverContext.useConfig(
        {
          ...config,
          [SYMBOLS.WEAVER_CONFIG]: "gqloom.zod",
        } as ZodWeaverConfig,
        () => ZodWeaver.unravel(schema)
      )
  }

  public static getGraphQLType(schema: Schema): GraphQLOutputType {
    return ZodWeaver.toNullableGraphQLType(schema)
  }

  protected static getGraphQLTypeBySelf(this: Schema): GraphQLOutputType {
    return ZodWeaver.toNullableGraphQLType(this)
  }
}

export * from "./metadata"
export * from "@gqloom/core"
