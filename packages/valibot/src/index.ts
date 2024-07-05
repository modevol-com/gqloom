import {
  type InferOutput,
  type InferInput,
  safeParseAsync,
  strictObjectAsync,
  parseAsync,
} from "valibot"
import {
  type GraphQLSilkIO,
  SYMBOLS,
  createLoom,
  ensureInterfaceType,
  mapValue,
  weaverContext,
  type GraphQLSilk,
  isSilk,
} from "@gqloom/core"
import {
  GraphQLBoolean,
  type GraphQLEnumValueConfigMap,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
  isNonNullType,
  type GraphQLOutputType,
  GraphQLEnumType,
  type GraphQLInterfaceType,
  isInterfaceType,
  isObjectType,
  GraphQLUnionType,
} from "graphql"
import { type AsObjectTypeMetadata, ValibotMetadataCollector } from "./metadata"
import { flatVariant, nullishTypes } from "./utils"
import {
  type SupportedSchema,
  type GenericSchemaOrAsync,
  type EnumLike,
  type ValibotWeaverConfigOptions,
  type ValibotWeaverConfig,
} from "./types"

export class ValibotWeaver {
  /**
   * get GraphQL Silk from Valibot Schema
   * @param schema Valibot Schema
   * @returns GraphQL Silk Like Valibot Schema
   */
  static unravel<TSchema extends GenericSchemaOrAsync>(
    schema: TSchema
  ): TSchema & GraphQLSilk<InferOutput<TSchema>, InferInput<TSchema>> {
    const config =
      weaverContext.value?.getConfig<ValibotWeaverConfig>("gqloom.valibot")

    return Object.assign(schema, {
      [SYMBOLS.GET_GRAPHQL_TYPE]: config
        ? function (this: GenericSchemaOrAsync) {
            return weaverContext.useConfig(config, () =>
              getGraphQLType.call(this)
            )
          }
        : getGraphQLType,
      [SYMBOLS.PARSE]: parse,
    })
  }
  static toNullableGraphQLType(
    schema: GenericSchemaOrAsync
  ): GraphQLOutputType {
    const gqlType = ValibotWeaver.toGraphQLType(schema)

    weaverContext.memo(gqlType)
    return ValibotWeaver.nullable(gqlType, schema)
  }

  static toGraphQLType(
    valibotSchema: GenericSchemaOrAsync,
    ...wrappers: GenericSchemaOrAsync[]
  ): GraphQLOutputType {
    const config = ValibotMetadataCollector.getFieldConfig(
      valibotSchema,
      ...wrappers
    )
    if (config?.type) return config.type

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
        const { name, ...enumConfig } =
          ValibotMetadataCollector.getEnumConfig(schema, ...wrappers) ?? {}
        if (!name) throw new Error("Enum must have a name")

        const existing = weaverContext.enumMap?.get(name)
        if (existing) return existing

        const values: GraphQLEnumValueConfigMap = {}

        if (schema.type === "picklist") {
          for (const value of schema.options) {
            values[String(value)] = { value }
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
        const { name, ...objectConfig } =
          ValibotMetadataCollector.getObjectConfig(schema, ...wrappers) ?? {}
        if (!name)
          throw new Error(
            `Object { ${Object.keys(schema.entries).join(", ")} } must have a name`
          )

        const existing = weaverContext.objectMap?.get(name)
        if (existing) return existing

        const strictSchema = strictObjectAsync(schema.entries)

        return new GraphQLObjectType({
          name,
          fields: mapValue(schema.entries, (field, key) => {
            if (key.startsWith("__")) return mapValue.SKIP
            const { type, ...fieldConfig } =
              ValibotMetadataCollector.getFieldConfig(field) ?? {}

            if (type === null) return mapValue.SKIP

            return {
              type: type ?? ValibotWeaver.toNullableGraphQLType(field),
              ...fieldConfig,
            }
          }),
          isTypeOf: (input) =>
            safeParseAsync(strictSchema, input).then((x) => x.success),
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

        const existing = weaverContext.unionMap?.get(name)
        if (existing) return existing

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
    const gqlType = weaverContext.memo(ValibotWeaver.toGraphQLType(item))

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
}

export * from "./metadata"

/**
 * get GraphQL Silk from Valibot Schema
 * @param schema Valibot Schema
 * @returns GraphQL Silk Like Valibot Schema
 */
export const valibotSilk = ValibotWeaver.unravel

function getGraphQLType(this: GenericSchemaOrAsync): GraphQLOutputType {
  return ValibotWeaver.toNullableGraphQLType(this)
}

function parse<TSchema extends GenericSchemaOrAsync>(
  this: TSchema,
  input: unknown
): Promise<InferOutput<TSchema>> {
  return parseAsync(this, input)
}

export type ValibotSchemaIO = [
  GenericSchemaOrAsync,
  "_types.input",
  "_types.output",
]

export const { query, mutation, field, resolver } = createLoom<
  ValibotSchemaIO | GraphQLSilkIO
>(
  (schema) => {
    if (isSilk(schema)) return schema
    return ValibotWeaver.unravel(schema)
  },
  (schema) => isSilk(schema) || isValibotSchema(schema)
)

function isValibotSchema(schema: any): schema is GenericSchemaOrAsync {
  if (!("kind" in schema)) return false
  return schema.kind === "schema"
}
