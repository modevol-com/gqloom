import {
  type GraphQLSilk,
  createLoom,
  mapValue,
  ensureInterfaceType,
  weaverContext,
  SYMBOLS,
  deepMerge,
  type GQLoomExtensions,
  type GraphQLSilkIO,
  isSilk,
  collectNames,
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
  type GraphQLObjectTypeConfig,
  type GraphQLUnionTypeConfig,
  type GraphQLObjectTypeExtensions,
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
  type ZodDiscriminatedUnionOption,
  z,
} from "zod"
import { ZodIDKinds } from "./utils"
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
  ): TSchema & GraphQLSilk<z.output<TSchema>, z.input<TSchema>> {
    const config = weaverContext.value?.getConfig<ZodWeaverConfig>("gqloom.zod")
    return Object.assign(schema, {
      [SYMBOLS.GET_GRAPHQL_TYPE]: config
        ? function (this: Schema) {
            return weaverContext.useConfig(config, () =>
              getGraphQLType.call(this)
            )
          }
        : getGraphQLType,
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

    return nullable(gqlType)
  }

  static toGraphQLType(
    schema: Schema,
    config?: TypeOrFieldConfig
  ): GraphQLOutputType {
    const existing = weaverContext.getGraphQLType(schema)
    if (existing) return existing
    const gqlType = ZodWeaver.toGraphQLTypePurely(schema, config)
    return weaverContext.memoGraphQLType(schema, gqlType)
  }

  static toGraphQLTypePurely(
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
      const { name, ...objectConfig } = ZodWeaver.getObjectConfig(
        schema,
        config
      )
      if (!name)
        throw new Error(
          `Object { ${Object.keys(schema.shape).join(", ")} } must have a name`
        )

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

  static getDiscriminatedUnionOptionName(
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
    return (schema) =>
      weaverContext.useConfig(
        {
          ...config,
          [SYMBOLS.WEAVER_CONFIG]: "gqloom.zod",
        } as ZodWeaverConfig,
        () => ZodWeaver.unravel(schema)
      )
  }
}

/**
 * get GraphQL Silk from Zod Schema
 * @param schema Zod Schema
 * @returns GraphQL Silk Like Zod Schema
 */
export function zodSilk<TSchema extends Schema>(
  schema: TSchema
): TSchema & GraphQLSilk<z.output<TSchema>, z.input<TSchema>>

/**
 * get GraphQL Silk from Zod Schema
 * @param silk GraphQL Silk
 * @returns GraphQL Silk
 */
export function zodSilk<TSilk extends GraphQLSilk>(silk: TSilk): TSilk

export function zodSilk(schema: ZodType | GraphQLSilk) {
  if (isSilk(schema)) return schema
  if (isZodSchemaRecord(schema)) {
    const inputSchema = z.object(schema)
    collectNames({ _: inputSchema })
    return ZodWeaver.unravel(inputSchema)
  }
  return ZodWeaver.unravel(schema)
}

zodSilk.isSilk = (schema: any) =>
  isSilk(schema) || isZodSchema(schema) || isZodSchemaRecord(schema)

zodSilk.input = <TInput extends Record<string, Schema>>(
  input: TInput
): InferInputSilk<TInput> => {
  return zodSilk(input as any)
}

export type ZodSchemaIO = [Schema, "_input", "_output"]

export type InferInputSilk<TInput extends Record<string, Schema>> = GraphQLSilk<
  InferInputO<TInput>,
  InferInputI<TInput>
>

export type InferInputI<TInput extends Record<string, Schema>> = {
  [K in keyof TInput]: z.input<TInput[K]>
}

export type InferInputO<TInput extends Record<string, Schema>> = {
  [K in keyof TInput]: z.output<TInput[K]>
}

export const { query, mutation, field, resolver, subscription } = createLoom<
  ZodSchemaIO | GraphQLSilkIO
>(zodSilk, zodSilk.isSilk)

function isZodSchemaRecord(target: any): target is Record<string, Schema> {
  return (
    typeof target === "object" &&
    target !== null &&
    Object.values(target).every(isZodSchema)
  )
}

function isZodSchema(target: any): target is Schema {
  return target instanceof ZodType
}

function getGraphQLType(this: Schema) {
  return ZodWeaver.toNullableGraphQLType(this)
}

function parseZod(this: Schema, data: any) {
  return this.parseAsync(data)
}

export * from "@gqloom/core"
