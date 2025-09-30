import {
  AUTO_ALIASING,
  SYMBOLS,
  ensureInterfaceType,
  mapValue,
  weave,
  weaverContext,
} from "@gqloom/core"
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
  type GraphQLOutputType,
  GraphQLString,
  GraphQLUnionType,
  isInterfaceType,
  isNonNullType,
  isObjectType,
} from "graphql"
import type { ZodTypeAny } from "zod/v3"
import type { $ZodObject, $ZodType, $ZodTypeDef } from "zod/v4/core"
import { asField } from "./metadata"
import type {
  FieldConfig,
  LooseZodObject,
  ZodWeaverConfig,
  ZodWeaverConfigOptions,
} from "./types"
import {
  getEnumConfig,
  getFieldConfig,
  getObjectConfig,
  getUnionConfig,
  isID,
  isZodArray,
  isZodBoolean,
  isZodDate,
  isZodDefault,
  isZodDiscriminatedUnion,
  isZodEnum,
  isZodInt,
  isZodLiteral,
  isZodNumber,
  isZodObject,
  isZodPipe,
  isZodString,
  isZodType,
  isZodUnion,
  resolveTypeByDiscriminatedUnion,
} from "./utils"
import { ZodWeaver as ZodWeaverV3 } from "./v3"

export class ZodWeaver {
  public static vendor = "zod"
  /**
   * get GraphQL Silk from Zod Schema
   * @param schema Zod Schema
   * @returns GraphQL Silk Like Zod Schema
   */
  public static unravel<TSchema extends $ZodType>(schema: TSchema): TSchema {
    const config = weaverContext.value?.getConfig<ZodWeaverConfig>("gqloom.zod")
    return Object.assign(schema, {
      [SYMBOLS.GET_GRAPHQL_TYPE]: config
        ? function (this: $ZodType) {
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

  protected static toNullableGraphQLType(schema: $ZodType): GraphQLOutputType {
    while (isZodPipe(schema)) {
      schema = schema._zod.def.in
    }
    const gqlType = ZodWeaver.toMemoriedGraphQLType(schema)

    const isNullable = (
      ["null", "nullable", "optional", "default"] as $ZodTypeDef["type"][]
    ).includes(schema._zod.def.type)
    if (isNullable) return gqlType

    if (isNonNullType(gqlType)) return gqlType
    return new GraphQLNonNull(gqlType)
  }

  protected static toMemoriedGraphQLType(schema: $ZodType): GraphQLOutputType {
    const existing = weaverContext.getGraphQLType(schema)
    if (existing) return existing
    const gqlType = ZodWeaver.toGraphQLType(schema)
    return weaverContext.memoGraphQLType(schema, gqlType)
  }

  protected static toGraphQLType(schema: $ZodType): GraphQLOutputType {
    const customType = (asField.get(schema) as FieldConfig | undefined)?.type
    if (customType) return customType

    const preset = weaverContext.getConfig<ZodWeaverConfig>("gqloom.zod")
    const presetType = preset?.presetGraphQLType?.(schema)
    if (presetType) return presetType

    if (isZodDefault(schema)) {
      return ZodWeaver.toMemoriedGraphQLType(schema._zod.def.innerType)
    }

    if (isZodArray(schema)) {
      return new GraphQLList(
        ZodWeaver.toNullableGraphQLType(schema._zod.def.element)
      )
    }

    if (
      "innerType" in schema._zod.def &&
      isZodType(schema._zod.def.innerType)
    ) {
      return ZodWeaver.toMemoriedGraphQLType(schema._zod.def.innerType)
    }

    if (isZodString(schema)) {
      if (isID(schema)) return GraphQLID
      return GraphQLString
    }

    if (isZodLiteral(schema)) {
      switch (typeof schema._zod.def.values[0]) {
        case "boolean":
          return GraphQLBoolean
        case "number":
          return GraphQLFloat
        case "string":
        default:
          return GraphQLString
      }
    }

    if (isZodNumber(schema)) {
      if (isZodInt(schema)) return GraphQLInt
      return GraphQLFloat
    }

    if (isZodBoolean(schema)) {
      return GraphQLBoolean
    }

    if (isZodDate(schema)) {
      return GraphQLString
    }

    if (isZodObject(schema)) {
      const { name = AUTO_ALIASING, ...objectConfig } = getObjectConfig(schema)

      return new GraphQLObjectType({
        name,
        fields: mapValue(
          (schema as $ZodObject)._zod.def.shape,
          (field, key) => {
            if (key.startsWith("__")) return mapValue.SKIP
            const { type, ...fieldConfig } = getFieldConfig(field)
            if (type === null || type === SYMBOLS.FIELD_HIDDEN)
              return mapValue.SKIP
            return {
              type: type ?? ZodWeaver.toNullableGraphQLType(field),
              ...fieldConfig,
            }
          }
        ),
        ...objectConfig,
      })
    }

    if (isZodEnum(schema)) {
      const {
        name = AUTO_ALIASING,
        valuesConfig,
        ...enumConfig
      } = getEnumConfig(schema)

      const values: GraphQLEnumValueConfigMap = {}

      Object.entries(schema._zod.def.entries).forEach(([key, value]) => {
        if (
          typeof schema._zod.def.entries?.[schema._zod.def.entries[key]] ===
          "number"
        )
          return
        values[key] = { value, ...valuesConfig?.[key] }
      })

      return new GraphQLEnumType({
        name,
        values,
        ...enumConfig,
      })
    }

    if (isZodUnion(schema)) {
      const { name = AUTO_ALIASING, ...unionConfig } = getUnionConfig(schema)

      const types = (schema._zod.def.options as $ZodType[]).map((s) => {
        const gqlType = ZodWeaver.toMemoriedGraphQLType(s)
        if (isObjectType(gqlType)) return gqlType
        throw new Error(
          `Union types ${name ?? "(unnamed)"} can only contain objects, but got ${gqlType}`
        )
      })

      return new GraphQLUnionType({
        resolveType: isZodDiscriminatedUnion(schema)
          ? resolveTypeByDiscriminatedUnion(schema)
          : undefined,
        types,
        name,
        ...unionConfig,
      })
    }

    if (isZodPipe(schema)) {
      return ZodWeaver.toNullableGraphQLType(schema._zod.def.in)
    }

    throw new Error(`zod type ${schema.constructor.name} is not supported`)
  }

  public static ensureInterfaceType(
    item: GraphQLInterfaceType | LooseZodObject
  ): GraphQLInterfaceType {
    if (isInterfaceType(item)) return item
    const gqlType = ZodWeaver.toMemoriedGraphQLType(item as unknown as $ZodType)

    return ensureInterfaceType(gqlType)
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

  public static getGraphQLType(
    schema: $ZodType | ZodTypeAny
  ): GraphQLOutputType {
    if ("_zod" in schema) {
      return ZodWeaver.toNullableGraphQLType(schema)
    } else {
      return ZodWeaverV3.getGraphQLType(schema)
    }
  }

  protected static getGraphQLTypeBySelf(this: $ZodType): GraphQLOutputType {
    return ZodWeaver.toNullableGraphQLType(this)
  }
}

export * from "./types"
export * from "./metadata"
export * from "./re-export"
