import {
  type GraphQLSilk,
  SYMBOLS,
  ensureInterfaceType,
  mapValue,
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
import type * as v from "valibot"
import { type AsObjectTypeMetadata, ValibotMetadataCollector } from "./metadata"
import type {
  EnumLike,
  GenericSchemaOrAsync,
  SupportedSchema,
  ValibotWeaverConfig,
  ValibotWeaverConfigOptions,
} from "./types"
import { flatVariant, nullishTypes } from "./utils"

export class ValibotWeaver {
  static vendor = "valibot"

  /**
   * get GraphQL Silk from Valibot Schema
   * @param schema Valibot Schema
   * @returns GraphQL Silk Like Valibot Schema
   */
  static unravel<TSchema extends GenericSchemaOrAsync>(
    schema: TSchema
  ): TSchema & GraphQLSilk<v.InferOutput<TSchema>, v.InferInput<TSchema>> {
    const config =
      weaverContext.value?.getConfig<ValibotWeaverConfig>("gqloom.valibot")

    return Object.assign(schema, {
      [SYMBOLS.GET_GRAPHQL_TYPE]: config
        ? function (this: GenericSchemaOrAsync) {
            return weaverContext.useConfig(config, () =>
              ValibotWeaver.getGraphQLTypeBySelf.call(this)
            )
          }
        : ValibotWeaver.getGraphQLTypeBySelf,
    })
  }
  static toNullableGraphQLType(
    schema: GenericSchemaOrAsync
  ): GraphQLOutputType {
    const gqlType = ValibotWeaver.toGraphQLType(schema)

    return ValibotWeaver.nullable(gqlType, schema)
  }

  static toGraphQLType(
    schema: GenericSchemaOrAsync,
    ...wrappers: GenericSchemaOrAsync[]
  ): GraphQLOutputType {
    const existing = weaverContext.getGraphQLType(schema)
    if (existing) return existing
    const gqlType = ValibotWeaver.toGraphQLTypePurely(schema, ...wrappers)
    return weaverContext.memoGraphQLType(schema, gqlType)
  }

  static toGraphQLTypePurely(
    valibotSchema: GenericSchemaOrAsync,
    ...wrappers: GenericSchemaOrAsync[]
  ): GraphQLOutputType {
    const config = ValibotMetadataCollector.getFieldConfig(
      valibotSchema,
      ...wrappers
    )
    if (config?.type) {
      if (typeof config.type === "function") return config.type()
      return config.type
    }

    const preset =
      weaverContext.getConfig<ValibotWeaverConfig>("gqloom.valibot")
    const presetType = preset?.presetGraphQLType?.(valibotSchema)
    if (presetType) return presetType

    const schema = valibotSchema as SupportedSchema
    switch (schema.type) {
      case "array": {
        const itemType = ValibotWeaver.toGraphQLType(
          schema.item,
          schema,
          ...wrappers
        )
        return new GraphQLList(ValibotWeaver.nullable(itemType, schema.item))
      }
      case "bigint":
        return GraphQLInt
      case "boolean":
        return GraphQLBoolean
      case "date":
        return GraphQLString
      case "enum":
      case "picklist": {
        const { name, valuesConfig, ...enumConfig } =
          ValibotMetadataCollector.getEnumConfig(schema, ...wrappers) ?? {}

        const values: GraphQLEnumValueConfigMap = {}
        if (schema.type === "picklist") {
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
            `Enum (${Object.values(values)
              .map((it) => it.value)
              .join(", ")}) must have a name`
          )

        return new GraphQLEnumType({
          name,
          values,
          ...enumConfig,
        })
      }
      case "literal":
        switch (typeof schema.literal) {
          case "boolean":
            return GraphQLBoolean
          case "number":
          case "bigint":
            return GraphQLFloat
          default:
            return GraphQLString
        }
      case "loose_object":
      case "object":
      case "object_with_rest":
      case "strict_object": {
        if (
          "pipe" in schema &&
          Array.isArray(schema.pipe) &&
          schema.pipe.length > 0
        ) {
          return ValibotWeaver.toGraphQLType(
            schema.pipe[0],
            schema,
            ...wrappers
          )
        }
        const { name, ...objectConfig } =
          ValibotMetadataCollector.getObjectConfig(schema, ...wrappers) ?? {}
        if (!name)
          throw new Error(
            `Object { ${Object.keys(schema.entries).join(", ")} } must have a name`
          )

        return new GraphQLObjectType({
          name,
          fields: mapValue(schema.entries, (field, key) => {
            if (key.startsWith("__")) return mapValue.SKIP
            const { type, ...fieldConfig } =
              ValibotMetadataCollector.getFieldConfig(field) ?? {}

            if (type === null) return mapValue.SKIP

            return {
              type:
                type === undefined
                  ? ValibotWeaver.toNullableGraphQLType(field)
                  : typeof type === "function"
                    ? type()
                    : type,
              ...fieldConfig,
            }
          }),
          ...objectConfig,
          interfaces: objectConfig.interfaces?.map(
            ValibotWeaver.ensureInterfaceType
          ),
        })
      }
      case "non_nullable":
      case "non_nullish":
      case "non_optional":
        return new GraphQLNonNull(
          ValibotWeaver.toGraphQLType(schema.wrapped, schema, ...wrappers)
        )
      case "nullable":
      case "nullish":
      case "optional":
        return ValibotWeaver.toGraphQLType(schema.wrapped, schema, ...wrappers)
      case "number": {
        if (ValibotMetadataCollector.isInteger(schema, ...wrappers))
          return GraphQLInt
        return GraphQLFloat
      }
      case "string": {
        if (ValibotMetadataCollector.isID(schema, ...wrappers)) return GraphQLID
        return GraphQLString
      }
      case "union":
      case "variant": {
        const { name, ...unionConfig } =
          ValibotMetadataCollector.getUnionConfig(schema, ...wrappers) ?? {}
        if (!name) throw new Error("Union type must have a name")

        const options =
          schema.type === "variant" ? flatVariant(schema) : schema.options

        const types = options.map((s) => {
          const gqlType = ValibotWeaver.toGraphQLType(s)
          if (isObjectType(gqlType)) return gqlType
          throw new Error(
            `Union types ${name} can only contain objects, but got ${gqlType}`
          )
        })

        return new GraphQLUnionType({
          name,
          types,
          ...unionConfig,
        })
      }
    }

    throw new Error(`Unsupported schema type ${schema.type}`)
  }

  protected static nullable(
    ofType: GraphQLOutputType,
    wrapper: GenericSchemaOrAsync
  ) {
    const isNullish = nullishTypes.has(wrapper.type)
    if (isNullish) return ofType
    if (isNonNullType(ofType)) return ofType
    return new GraphQLNonNull(ofType)
  }

  protected static ensureInterfaceType(
    item: NonNullable<
      AsObjectTypeMetadata<object>["config"]["interfaces"]
    >[number]
  ): GraphQLInterfaceType {
    if (isInterfaceType(item)) return item
    const gqlType = ValibotWeaver.toGraphQLType(item)

    return ensureInterfaceType(gqlType)
  }

  /**
   * Create a Valibot weaver config object
   * @param config Valibot weaver config options
   * @returns a Valibot weaver config object
   */
  static config = function (
    config: ValibotWeaverConfigOptions
  ): ValibotWeaverConfig {
    return {
      ...config,
      vendorWeaver: ValibotWeaver,
      [SYMBOLS.WEAVER_CONFIG]: "gqloom.valibot",
    }
  }

  /**
   * Use a Valibot weaver config
   * @param config Valibot weaver config options
   * @returns a new Valibot to silk function
   */
  static useConfig = function (
    config: ValibotWeaverConfigOptions
  ): typeof ValibotWeaver.unravel {
    return (schema) =>
      weaverContext.useConfig(
        {
          ...config,
          [SYMBOLS.WEAVER_CONFIG]: "gqloom.valibot",
        },
        () => ValibotWeaver.unravel(schema)
      )
  }

  static getGraphQLType(schema: GenericSchemaOrAsync): GraphQLOutputType {
    return ValibotWeaver.toNullableGraphQLType(schema)
  }

  static getGraphQLTypeBySelf(this: GenericSchemaOrAsync): GraphQLOutputType {
    return ValibotWeaver.toNullableGraphQLType(this)
  }
}

export * from "./metadata"
export * from "@gqloom/core"
