import * as v from "valibot"
import {
  type GraphQLSilkIO,
  SYMBOLS,
  createLoom,
  ensureInterfaceType,
  mapValue,
  weaverContext,
  type GraphQLSilk,
  isSilk,
  collectNames,
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
import {
  type AsObjectTypeMetadata,
  ValibotMetadataCollector,
  asInputArgs,
} from "./metadata"
import { flatVariant, nullishTypes } from "./utils"
import {
  type SupportedSchema,
  type GenericSchemaOrAsync,
  type EnumLike,
  type ValibotWeaverConfigOptions,
  type ValibotWeaverConfig,
} from "./types"
export * from "@gqloom/core"

export class ValibotWeaver {
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
              ValibotWeaver.getGraphQLType.call(this)
            )
          }
        : ValibotWeaver.getGraphQLType,
      [SYMBOLS.PARSE]: ValibotWeaver.parse,
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

  static parse<TSchema extends GenericSchemaOrAsync>(
    this: TSchema,
    input: unknown
  ): Promise<v.InferOutput<TSchema>> | v.InferOutput<TSchema> {
    return this.async
      ? v.parseAsync(this, input)
      : v.parse(this as v.GenericSchema, input)
  }

  static getGraphQLType(this: GenericSchemaOrAsync): GraphQLOutputType {
    return ValibotWeaver.toNullableGraphQLType(this)
  }
}

export * from "./metadata"
/**
 * get GraphQL Silk from Valibot Schema
 * @param schema Valibot Schema
 * @returns GraphQL Silk Like Valibot Schema
 */
export function valibotSilk<TSchema extends GenericSchemaOrAsync>(
  schema: TSchema
): TSchema & GraphQLSilk<v.InferOutput<TSchema>, v.InferInput<TSchema>>

/**
 * get GraphQL Silk from Valibot Schema
 * @param silk GraphQL Silk
 * @returns GraphQL Silk
 */
export function valibotSilk<TSilk>(silk: TSilk): TSilk
export function valibotSilk(schema: GenericSchemaOrAsync | GraphQLSilk) {
  if (isSilk(schema)) return schema
  if (isValibotSchemaRecord(schema)) {
    const inputSchema = v.objectAsync(schema)
    collectNames({ [`InputArgs${asInputArgs.increasingID++}`]: inputSchema })
    return ValibotWeaver.unravel(inputSchema)
  }
  return ValibotWeaver.unravel(schema)
}

valibotSilk.isSilk = (schema: any) =>
  isSilk(schema) || isValibotSchema(schema) || isValibotSchemaRecord(schema)

valibotSilk.input = <TInput extends Record<string, GenericSchemaOrAsync>>(
  input: GenericSchemaOrAsync
): InferInputSilk<TInput> => {
  return valibotSilk(input as any)
}

export type InferInputSilk<
  TInput extends Record<string, GenericSchemaOrAsync>,
> = GraphQLSilk<InferInputO<TInput>, InferInputI<TInput>>

export type InferInputI<TInput extends Record<string, GenericSchemaOrAsync>> = {
  [K in keyof TInput]: v.InferInput<TInput[K]>
}

export type InferInputO<TInput extends Record<string, GenericSchemaOrAsync>> = {
  [K in keyof TInput]: v.InferOutput<TInput[K]>
}

export type ValibotSchemaIO = [
  GenericSchemaOrAsync,
  "_types.input",
  "_types.output",
]

export const { query, mutation, field, resolver, subscription } = createLoom<
  ValibotSchemaIO | GraphQLSilkIO
>(valibotSilk, valibotSilk.isSilk)

function isValibotSchemaRecord(
  schema: any
): schema is Record<string, GenericSchemaOrAsync> {
  return (
    typeof schema === "object" &&
    schema !== null &&
    Object.values(schema).every(isValibotSchema)
  )
}

function isValibotSchema(schema: any): schema is GenericSchemaOrAsync {
  if (typeof schema !== "object") return false
  if (!("kind" in schema)) return false
  if (!("async" in schema)) return false
  if (!("type" in schema)) return false
  return (
    schema.kind === "schema" &&
    typeof schema.async === "boolean" &&
    typeof schema.type === "string"
  )
}
