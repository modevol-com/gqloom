import {
  type GraphQLSilk,
  createLoom,
  mapValue,
  ensureInterfaceType,
  weaverContext,
  mergeExtensions,
  SYMBOLS,
  provideWeaverContext,
  initWeaverContext,
} from "@gqloom/core"
import {
  GraphQLString,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLObjectType,
  type GraphQLOutputType,
  type GraphQLFieldConfig,
  GraphQLList,
  GraphQLEnumType,
  type GraphQLEnumValueConfigMap,
  type ThunkReadonlyArray,
  type GraphQLInterfaceType,
  isObjectType,
  GraphQLUnionType,
  isNonNullType,
} from "graphql"
import {
  type SchemaDescription,
  isSchema,
  type InferType,
  type Schema,
  type SchemaObjectDescription,
  type SchemaFieldDescription,
  type SchemaInnerTypeDescription,
} from "yup"
import {
  type GQLoomMetadata,
  type YupWeaverConfigOptions,
  type YupWeaverConfig,
} from "./types"

export * from "./types"
export * from "./union"

export class YupWeaver {
  /**
   * get GraphQL Silk from Yup Schema
   * @param schema Yup Schema
   * @returns GraphQL Silk Like Yup Schema
   */
  static unravel<TSchema extends Schema<any, any, any, any>>(
    schema: TSchema
  ): TSchema & GraphQLSilk<InferType<TSchema>, InferType<TSchema>> {
    return Object.assign(schema, {
      [SYMBOLS.GET_GRAPHQL_TYPE]: getGraphQLType,
      [SYMBOLS.PARSE]: parseYup,
    })
  }

  static toNullableGraphQLType(description: SchemaDescription) {
    const gqlType = YupWeaver.toGraphQLType(description)

    weaverContext.memo(gqlType)
    return nullable(gqlType)

    function nullable(ofType: GraphQLOutputType) {
      if (description.nullable || description.optional) return ofType
      if (isNonNullType(ofType)) return ofType
      return new GraphQLNonNull(ofType)
    }
  }

  static toGraphQLType(description: SchemaDescription): GraphQLOutputType {
    const customTypeOrFn = description.meta?.type
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
        const name = description.meta?.name ?? description.label
        if (!name) throw new Error("object type must have a name")
        const existing = weaverContext.objectMap?.get(name)
        if (existing) return existing
        return new GraphQLObjectType({
          interfaces: YupWeaver.ensureInterfaceTypes(
            description.meta?.interfaces
          ),
          name,
          extensions: mergeExtensions(
            { defaultValue: description.default },
            description.meta?.extension
          ),
          description: description.meta?.description,
          fields: mapValue(
            (description as SchemaObjectDescription).fields,
            (fieldDescription, key) => {
              if (key.startsWith("__")) return mapValue.SKIP
              const d = YupWeaver.ensureSchemaDescription(fieldDescription)
              if (d.meta?.type === null) return mapValue.SKIP
              return {
                extensions: mergeExtensions(
                  { defaultValue: d.default },
                  d.meta?.extension
                ),
                type: YupWeaver.toNullableGraphQLType(d),
                description: d?.meta?.description,
              } as GraphQLFieldConfig<any, any>
            }
          ),
          ...description.meta?.objectType,
        })
      }
      case "array": {
        const innerType = (description as SchemaInnerTypeDescription).innerType
        if (Array.isArray(innerType))
          throw new Error("Array type cannot have multiple inner types")

        if (innerType == null)
          throw new Error("Array type must have an inner type")

        return new GraphQLList(
          YupWeaver.toNullableGraphQLType(
            YupWeaver.ensureSchemaDescription(innerType)
          )
        )
      }

      case "union": {
        const innerType = (description as SchemaInnerTypeDescription).innerType
        if (innerType == null)
          throw new Error("Union type must have inner types")

        const innerTypes = Array.isArray(innerType) ? innerType : [innerType]

        const name = description.meta?.name ?? description.label
        if (!name) throw new Error("union type must have a name")
        const existing = weaverContext.unionMap?.get(name)
        if (existing) return existing

        const types = innerTypes.map((innerType) => {
          const gqlType = YupWeaver.toNullableGraphQLType(
            YupWeaver.ensureSchemaDescription(innerType)
          )
          if (isObjectType(gqlType)) return gqlType
          throw new Error(
            `Union types ${name} can only contain objects, but got ${gqlType}`
          )
        })

        return new GraphQLUnionType({
          name,
          types,
          description: description.meta?.description,
          ...description.meta?.unionType,
        })
      }
      default:
        throw new Error(`yup type ${description.type} is not supported`)
    }
  }

  static ensureSchemaDescription(
    description: SchemaFieldDescription
  ): SchemaDescription {
    if (description.type === "lazy")
      throw new Error("lazy type is not supported")
    return description as SchemaDescription
  }

  static ensureInterfaceTypes(
    thunkList: ThunkReadonlyArray<Schema> | undefined
  ): ReadonlyArray<GraphQLInterfaceType> | undefined {
    if (thunkList == null) return undefined
    const list = typeof thunkList === "function" ? thunkList() : thunkList

    return list.map((yupSchema) =>
      ensureInterfaceType(
        getGraphQLType.call(yupSchema),
        yupSchema.describe().meta?.interfaceType
      )
    )
  }

  static isEnumType(description: SchemaDescription): boolean {
    return description.oneOf.length > 0
  }

  static getEnumType(description: SchemaDescription): GraphQLEnumType | null {
    if (!YupWeaver.isEnumType(description)) return null
    const meta: GQLoomMetadata | undefined = description.meta

    const name = meta?.name ?? description.label
    if (!name)
      throw new Error(
        `enum type ${description.oneOf.join("|")} must have a name`
      )
    const existing = weaverContext.enumMap?.get(name)
    if (existing) return existing

    const values: GraphQLEnumValueConfigMap = {}

    if (meta?.enum) {
      Object.entries(meta.enum).forEach(([key, value]) => {
        if (typeof meta.enum?.[meta.enum[key]] === "number") return
        const config = meta?.enumValues?.[key]
        if (typeof config === "object") values[key] = config
        else values[key] = { value, description: config }
      })
    } else {
      description.oneOf.forEach((value) => {
        const key = String(value)
        const config = meta?.enumValues?.[key]
        if (typeof config === "object") values[key] = config
        else values[key] = { value, description: config }
      })
    }

    return new GraphQLEnumType({
      name: meta?.name ?? description.label ?? "",
      description: meta?.description,
      values,
      ...meta?.enumType,
    })
  }

  /**
   * Create a yup weaver config object
   * @param config yup weaver config options
   * @returns a yup weaver config object
   */
  static config = function (config: YupWeaverConfigOptions): YupWeaverConfig {
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
  static useConfig = function (
    config: YupWeaverConfigOptions
  ): typeof YupWeaver.unravel {
    const context = weaverContext.value ?? initWeaverContext()
    context.setConfig<YupWeaverConfig>({
      ...config,
      [SYMBOLS.WEAVER_CONFIG]: "gqloom.yup",
    })
    return (schema) =>
      provideWeaverContext(() => YupWeaver.unravel(schema), context)
  }
}

export const yupSilk: typeof YupWeaver.unravel = YupWeaver.unravel

export type YupSchemaIO = [Schema, "__outputType", "__outputType"]

function getGraphQLType(this: Schema) {
  const schemaDescription = this.describe()
  schemaDescription.label ??= weaverContext.names.get(this)
  return YupWeaver.toNullableGraphQLType(schemaDescription)
}

function parseYup(this: Schema, input: any) {
  return this.validate(input, {
    strict: true,
    abortEarly: false,
    stripUnknown: true,
  })
}

export const yupLoom = createLoom<YupSchemaIO>(YupWeaver.unravel, isSchema)

// TODO: created Loom should accept GraphQLSilk
export const { query, mutation, field, resolver } = yupLoom
