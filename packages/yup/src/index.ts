import {
  type GraphQLSilk,
  createLoom,
  mapValue,
  ensureInterfaceType,
  weaverContext,
  mergeExtensions,
  SYMBOLS,
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
import { type YupWeaverOptions, type GQLoomMetadata } from "./types"

export * from "./types"
export * from "./union"

export class YupSilk<TSchema extends Schema<any, any, any, any>>
  implements GraphQLSilk<InferType<TSchema>, InferType<TSchema>>
{
  "~types"?: { input: InferType<TSchema>; output: InferType<TSchema> }
  schemaDescription: SchemaDescription
  nonNull: boolean

  constructor(public schema: TSchema) {
    this.schemaDescription = schema.describe()
    this.schemaDescription.label ??= weaverContext.names.get(schema)
    this.nonNull =
      !this.schemaDescription.nullable && !this.schemaDescription.optional
  }

  [SYMBOLS.GET_GRAPHQL_TYPE]() {
    return YupSilk.toNullableGraphQLType(this.schemaDescription)
  }

  [SYMBOLS.PARSE](input: InferType<TSchema>): Promise<InferType<TSchema>> {
    return this.schema.validate(input)
  }

  static get options(): YupWeaverOptions | undefined {
    return weaverContext.options
  }

  static toNullableGraphQLType(description: SchemaDescription) {
    const gqlType = YupSilk.toGraphQLType(description)

    weaverContext.memo(gqlType)
    return nullable(gqlType)

    function nullable(ofType: GraphQLOutputType) {
      if (description.nullable || description.optional) return ofType
      if (isNonNullType(ofType)) return ofType
      return new GraphQLNonNull(ofType)
    }
  }

  static toGraphQLType(description: SchemaDescription): GraphQLOutputType {
    const customType = description.meta?.type
    if (customType) return customType()

    const presetType = YupSilk.options?.yupPresetGraphQLType?.(description)
    if (presetType) return presetType

    const maybeEnum = YupSilk.getEnumType(description)
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
          isTypeOf: description.meta?.isTypeOf,
          interfaces: YupSilk.ensureInterfaceTypes(
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
            (fieldDescription) => {
              const d = YupSilk.ensureSchemaDescription(fieldDescription)
              return {
                extensions: mergeExtensions(
                  { defaultValue: d.default },
                  d.meta?.extension
                ),
                type: YupSilk.toNullableGraphQLType(d),
                description: d?.meta?.description,
              } as GraphQLFieldConfig<any, any>
            }
          ),
        })
      }
      case "array": {
        const innerType = (description as SchemaInnerTypeDescription).innerType
        if (Array.isArray(innerType))
          throw new Error("Array type cannot have multiple inner types")

        if (innerType == null)
          throw new Error("Array type must have an inner type")

        return new GraphQLList(
          YupSilk.toNullableGraphQLType(
            YupSilk.ensureSchemaDescription(innerType)
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
          const gqlType = YupSilk.toNullableGraphQLType(
            YupSilk.ensureSchemaDescription(innerType)
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
          resolveType: description.meta?.resolveType,
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
      ensureInterfaceType(new YupSilk(yupSchema)[SYMBOLS.GET_GRAPHQL_TYPE]())
    )
  }

  static isEnumType(description: SchemaDescription): boolean {
    return description.oneOf.length > 0
  }

  static getEnumType(description: SchemaDescription): GraphQLEnumType | null {
    if (!YupSilk.isEnumType(description)) return null
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
    })
  }
}

export type YupSchemaIO = [Schema, "__outputType", "__outputType"]

export function yupSilk<TSchema extends Schema<any, any, any, any>>(
  schema: TSchema
): YupSilk<TSchema> {
  return new YupSilk(schema)
}

export const yupLoom = createLoom<YupSchemaIO>(yupSilk, isSchema)
export const { query, mutation, field, resolver } = yupLoom
