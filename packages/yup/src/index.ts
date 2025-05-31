import {
  type GraphQLSilk,
  SYMBOLS,
  type StandardSchemaV1,
  deepMerge,
  ensureInterfaceType,
  isSilk,
  mapValue,
  weaverContext,
} from "@gqloom/core"
import { LoomObjectType } from "@gqloom/core"
import {
  GraphQLBoolean,
  GraphQLEnumType,
  type GraphQLEnumValueConfigMap,
  type GraphQLFieldConfig,
  GraphQLFloat,
  GraphQLInt,
  type GraphQLInterfaceType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  type GraphQLObjectTypeExtensions,
  type GraphQLOutputType,
  GraphQLString,
  GraphQLUnionType,
  type ThunkReadonlyArray,
  isNonNullType,
  isObjectType,
} from "graphql"
import {
  type ArraySchema,
  type ISchema,
  type InferType,
  type ObjectSchema,
  type Reference,
  Schema,
  type SchemaDescription,
  ValidationError,
  isSchema,
} from "yup"
import type {
  GQLoomMetadata,
  YupWeaverConfig,
  YupWeaverConfigOptions,
} from "./types"
import type { UnionSchema } from "./union"

export * from "./types"
export * from "./union"

export class YupWeaver {
  /**
   * get GraphQL Silk from Yup Schema
   * @param schema Yup Schema
   * @returns GraphQL Silk Like Yup Schema
   */
  public static unravel<TSchema extends Schema<any, any, any, any>>(
    schema: TSchema
  ): TSchema & GraphQLSilk<InferType<TSchema>, InferType<TSchema>> {
    const config = weaverContext.value?.getConfig<YupWeaverConfig>("gqloom.yup")
    return Object.assign(schema, {
      "~standard": {
        version: 1,
        vendor: "gqloom.yup",
        validate: (value) => parseYup(schema, value),
      } satisfies StandardSchemaV1.Props<
        InferType<TSchema>,
        InferType<TSchema>
      >,
      [SYMBOLS.GET_GRAPHQL_TYPE]: config
        ? function (this: Schema) {
            return weaverContext.useConfig(config, () =>
              getGraphQLType.call(this)
            )
          }
        : getGraphQLType,
    })
  }

  public static toNullableGraphQLType(schema: Schema) {
    const description = YupWeaver.describe(schema)
    const gqlType = YupWeaver.toGraphQLType(schema)

    weaverContext.memoNamedType(gqlType)
    return nullable(gqlType)

    function nullable(ofType: GraphQLOutputType) {
      if (description.nullable || description.optional) return ofType
      if (isNonNullType(ofType)) return ofType
      return new GraphQLNonNull(ofType)
    }
  }

  public static toGraphQLType(schema: Schema): GraphQLOutputType {
    const description = YupWeaver.describe(schema)
    const customTypeOrFn = description.meta?.asField?.type

    const customType =
      typeof customTypeOrFn === "function" ? customTypeOrFn() : customTypeOrFn

    if (customType) return customType

    const config = weaverContext.getConfig<YupWeaverConfig>("gqloom.yup")
    const presetType = config?.presetGraphQLType?.(description)
    if (presetType) return presetType

    const maybeEnum = YupWeaver.getEnumType(description)
    if (maybeEnum) return maybeEnum

    switch (description.type) {
      case "string":
        return GraphQLString
      case "number": {
        if (
          (description as SchemaDescription).tests.some(
            (t: { name?: string }) => t?.name === "integer"
          )
        )
          return GraphQLInt
        return GraphQLFloat
      }
      case "boolean":
        return GraphQLBoolean
      case "date":
        return GraphQLString
      case "object": {
        const { interfaces, ...objectConfig } =
          description.meta?.asObjectType ?? {}
        const name =
          objectConfig.name ??
          description.label ??
          weaverContext.names.get(schema) ??
          LoomObjectType.AUTO_ALIASING

        const existing = weaverContext.getNamedType(name)
        if (existing) return existing
        const objectSchema = schema as ObjectSchema<
          Record<string, unknown>,
          unknown
        >
        return new GraphQLObjectType({
          interfaces: YupWeaver.ensureInterfaceTypes(interfaces),
          name,
          extensions: deepMerge(
            { defaultValue: description.default },
            description.meta?.asField?.extensions
          ) as GraphQLObjectTypeExtensions,
          description: description.meta?.description,
          fields: mapValue(objectSchema.fields, (fieldSchemaOrigin, key) => {
            if (key.startsWith("__")) return mapValue.SKIP
            const fieldSchema = YupWeaver.ensureSchema(fieldSchemaOrigin)
            const fieldDesc = fieldSchema.describe()
            if (
              fieldDesc.meta?.asField?.type === null ||
              fieldDesc.meta?.asField?.type === SYMBOLS.FIELD_HIDDEN
            )
              return mapValue.SKIP
            const { type: _, ...rest } = fieldDesc.meta?.asField ?? {}
            return {
              extensions: deepMerge(
                { defaultValue: fieldDesc.default },
                fieldDesc.meta?.asField?.extensions
              ),
              type: YupWeaver.toNullableGraphQLType(fieldSchema),
              description: fieldDesc?.meta?.description,
              ...rest,
            } as GraphQLFieldConfig<any, any>
          }),
          ...objectConfig,
        })
      }
      case "array": {
        const arraySchema = schema as ArraySchema<unknown[], unknown>
        const innerType = arraySchema.innerType
        if (Array.isArray(innerType))
          throw new Error("Array type cannot have multiple inner types")

        if (innerType == null)
          throw new Error("Array type must have an inner type")

        return new GraphQLList(
          YupWeaver.toNullableGraphQLType(innerType as Schema)
        )
      }

      case "union": {
        const unionSchema = schema as UnionSchema

        const innerTypes = unionSchema.spec.types

        const name =
          description.meta?.asUnionType?.name ??
          description.label ??
          weaverContext.names.get(unionSchema)
        if (!name) throw new Error("union type must have a name")
        const existing = weaverContext.getNamedType(name)
        if (existing) return existing

        const types = innerTypes.map((innerType) => {
          const gqlType = YupWeaver.toNullableGraphQLType(innerType)
          if (isObjectType(gqlType)) return gqlType
          throw new Error(
            `Union types ${name} can only contain objects, but got ${gqlType}`
          )
        })

        return new GraphQLUnionType({
          name,
          types,
          description: description.meta?.description,
          ...description.meta?.asUnionType,
        })
      }
      default:
        throw new Error(`yup type ${description.type} is not supported`)
    }
  }

  public static ensureSchema(
    schema: Reference<unknown> | ISchema<unknown, unknown, any, any>
  ): Schema {
    if (schema instanceof Schema) return schema
    throw new Error("type is not supported", { cause: schema })
  }

  public static ensureInterfaceTypes(
    thunkList: ThunkReadonlyArray<Schema> | undefined
  ): ReadonlyArray<GraphQLInterfaceType> | undefined {
    if (thunkList == null) return undefined
    const list = typeof thunkList === "function" ? thunkList() : thunkList

    return list.map((yupSchema) =>
      ensureInterfaceType(
        getGraphQLType.call(yupSchema),
        yupSchema.describe().meta?.asInterfaceType
      )
    )
  }

  public static isEnumType(description: SchemaDescription): boolean {
    if (description.meta?.asEnumType) return true
    if (description.oneOf.length <= 0) return false
    return description.oneOf.every((value) => typeof value === "string")
  }

  public static getEnumType(
    description: SchemaDescription
  ): GraphQLEnumType | null {
    if (!YupWeaver.isEnumType(description)) return null
    const meta: GQLoomMetadata | undefined = description.meta

    const name = description.meta?.asEnumType?.name ?? description.label

    if (!name)
      throw new Error(
        `enum type ${description.oneOf.join("|")} must have a name`
      )
    const existing = weaverContext.getNamedType<GraphQLEnumType>(name)
    if (existing) return existing

    const values: GraphQLEnumValueConfigMap = {}

    if (meta?.asEnumType?.enum) {
      for (const [key, value] of Object.entries(meta.asEnumType.enum)) {
        if (typeof meta.asEnumType.enum[meta.asEnumType.enum[key]] === "number")
          continue
        const config = meta?.asEnumType?.valuesConfig?.[key]
        values[key] = { value, ...config }
      }
    } else {
      description.oneOf.forEach((value) => {
        const key = String(value)
        const config = meta?.asEnumType?.valuesConfig?.[key]
        values[key] = { value, ...config }
      })
    }

    return new GraphQLEnumType({
      name,
      description: meta?.description,
      values,
      ...meta?.asEnumType,
    })
  }

  /**
   * Create a yup weaver config object
   * @param config yup weaver config options
   * @returns a yup weaver config object
   */
  public static config = function (
    config: YupWeaverConfigOptions
  ): YupWeaverConfig {
    return {
      ...config,
      [SYMBOLS.WEAVER_CONFIG]: "gqloom.yup",
    }
  }

  /**
   * Use a yup weaver config
   * @param config yup weaver config options
   * @returns a new yup to silk function
   */
  public static useConfig = function (
    config: YupWeaverConfigOptions
  ): typeof YupWeaver.unravel {
    return (schema) =>
      weaverContext.useConfig(
        {
          ...config,
          [SYMBOLS.WEAVER_CONFIG]: "gqloom.yup",
        } as YupWeaverConfig,
        () => YupWeaver.unravel(schema)
      )
  }

  public static DescriptionMap = new WeakMap<Schema, SchemaDescription>()

  protected static describe(schema: Schema): SchemaDescription {
    const existing = YupWeaver.DescriptionMap.get(schema)
    if (existing) return existing

    const description = schema.describe()
    YupWeaver.DescriptionMap.set(schema, description)
    return description
  }
}

/**
 * get GraphQL Silk from Yup Schema
 * @param schema Yup Schema
 * @returns GraphQL Silk Like Yup Schema
 */
export function yupSilk<TSchema extends Schema<any, any, any, any>>(
  schema: TSchema
): TSchema & GraphQLSilk<InferType<TSchema>, InferType<TSchema>>

/**
 * get GraphQL Silk from Yup Schema
 * @param silk GraphQL Silk
 * @returns GraphQL Silk
 */
export function yupSilk<TSilk extends GraphQLSilk>(silk: TSilk): TSilk

export function yupSilk(schema: Schema<any, any, any, any> | GraphQLSilk) {
  if (isSilk(schema)) return schema
  return YupWeaver.unravel(schema)
}

yupSilk.isSilk = (schema: any) => isSilk(schema) || isSchema(schema)

export type YupSchemaIO = [Schema, "__outputType", "__outputType"]

function getGraphQLType(this: Schema) {
  return YupWeaver.toNullableGraphQLType(this)
}

async function parseYup(
  schema: Schema,
  input: any
): Promise<StandardSchemaV1.Result<any>> {
  try {
    const value = await schema.validate(input, {
      strict: true,
      abortEarly: false,
      stripUnknown: true,
    })
    return { value }
  } catch (error) {
    if (error instanceof ValidationError) {
      return { issues: issuesFromValidationError(error) }
    }
    return {
      issues: [{ message: error?.toString() ?? "Invalid input" }],
    }
  }
}

function issuesFromValidationError(
  err: ValidationError
): StandardSchemaV1.Issue[] {
  return [err, ...err.inner].map((e) => ({
    message: e.message,
    ...(e.path && { path: [e.path] }),
  }))
}

export * from "./types"
export {
  collectName,
  collectNames,
  weave,
  silk,
  getGraphQLType,
  parseSilk,
  SchemaWeaver,
} from "@gqloom/core"
