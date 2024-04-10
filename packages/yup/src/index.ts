import { type GraphQLSilk, createLoom, mapValue } from "@gqloom/core"
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

export class YupSilk<TSchema extends Schema>
  implements GraphQLSilk<InferType<TSchema>, InferType<TSchema>>
{
  _types?: { input: InferType<TSchema>; output: InferType<TSchema> }
  constructor(public schema: TSchema) {}

  getType() {
    const description = this.schema.describe()
    return YupSilk.getWrappedType(description)
  }

  static getWrappedType(description: SchemaDescription) {
    const ofType = YupSilk.getFieldType(description)
    if (description.nullable || description.optional) return ofType
    return new GraphQLNonNull(ofType)
  }

  static getFieldType(description: SchemaDescription): GraphQLOutputType {
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
        const name = description.label ?? description.meta?.name
        return new GraphQLObjectType({
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

  parse(input: InferType<TSchema>): Promise<InferType<TSchema>> {
    return this.schema.cast(input)
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
