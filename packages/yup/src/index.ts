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
} from "graphql"
import {
  type SchemaDescription,
  isSchema,
  type InferType,
  type Schema,
  type SchemaObjectDescription,
  type SchemaFieldDescription,
} from "yup"

export class YupSilk<TSchema extends Schema>
  implements GraphQLSilk<InferType<TSchema>, InferType<TSchema>>
{
  _types?: { input: InferType<TSchema>; output: InferType<TSchema> }
  constructor(public schema: TSchema) {}

  getType() {
    const description = this.schema.describe()
    return YupSilk.getMayNullType(description)
  }

  static getMayNullType(description: SchemaFieldDescription) {
    const ofType = YupSilk.getPropertyType(description)
    if (
      (description as SchemaDescription)?.nullable ||
      (description as SchemaDescription)?.optional
    )
      return ofType
    return new GraphQLNonNull(ofType)
  }

  static getPropertyType(
    description: SchemaFieldDescription
  ): GraphQLOutputType {
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
            (d) =>
              ({
                type: YupSilk.getMayNullType(d),
                description: (d as SchemaDescription)?.meta?.description,
              }) as GraphQLFieldConfig<any, any>
          ),
        })
      }
      default:
        throw new Error(`yup type ${description.type} is not supported`)
    }
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
