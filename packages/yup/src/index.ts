import {
  type GraphQLSilk,
  createLoom,
  mapValue,
  ensureInterfaceType,
  weaverScope,
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
import { type GQLoomMetadata } from "./types"

export * from "./types"
export * from "./union"

export class YupSilk<TSchema extends Schema>
  implements GraphQLSilk<InferType<TSchema>, InferType<TSchema>>
{
  _types?: { input: InferType<TSchema>; output: InferType<TSchema> }
  constructor(public schema: TSchema) {}

  getType() {
    const existing = weaverScope.objectMap?.get(this.schema)
    if (existing) return existing

    const description = this.schema.describe()
    const gqlType = YupSilk.getWrappedType(description)
    if (isObjectType(gqlType)) {
      weaverScope.objectMap?.set(this.schema, gqlType)
    }
    return gqlType
  }

  parse(input: InferType<TSchema>): Promise<InferType<TSchema>> {
    return this.schema.validate(input)
  }

  static getWrappedType(description: SchemaDescription) {
    const ofType = YupSilk.getGraphQLType(description)
    if (description.nullable || description.optional) return ofType
    return new GraphQLNonNull(ofType)
  }

  static getGraphQLType(description: SchemaDescription): GraphQLOutputType {
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
        const name = description.label ?? description.meta?.name ?? ""
        return new GraphQLObjectType({
          isTypeOf: description.meta?.isTypeOf,
          interfaces: YupSilk.ensureInterfaceTypes(
            description.meta?.interfaces
          ),
          name,
          description: description.meta?.description,
          fields: mapValue(
            (description as SchemaObjectDescription).fields,
            (fieldDescription) => {
              const d = YupSilk.ensureSchemaDescription(fieldDescription)
              return {
                type: YupSilk.getWrappedType(d),
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
          YupSilk.getWrappedType(YupSilk.ensureSchemaDescription(innerType))
        )
      }

      case "union": {
        const innerType = (description as SchemaInnerTypeDescription).innerType
        if (innerType == null)
          throw new Error("Union type must have inner types")

        const innerTypes = Array.isArray(innerType) ? innerType : [innerType]

        const name = description.label ?? description.meta?.name ?? ""

        const types = () =>
          innerTypes.map((innerType) => {
            const gqlType = YupSilk.getWrappedType(
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
      ensureInterfaceType(new YupSilk(yupSchema).getType())
    )
  }

  static getEnumType(description: SchemaDescription): GraphQLEnumType | null {
    if (!description.oneOf.length) return null

    const meta: GQLoomMetadata | undefined = description.meta

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
      name: description.label ?? meta?.name ?? "",
      description: meta?.description,
      values,
    })
  }
}

export type YupSchemaIO = [Schema, "__outputType", "__outputType"]

export function yupSilk<TSchema extends Schema>(
  schema: TSchema
): YupSilk<TSchema> {
  return new YupSilk(schema)
}

export const { query, mutation, field, resolver } = createLoom<YupSchemaIO>(
  yupSilk,
  isSchema
)
