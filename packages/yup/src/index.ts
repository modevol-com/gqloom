import { type GraphQLSilk, createLoom } from "@gqloom/core"
import { GraphQLString } from "graphql"
import { isSchema, type InferType, type Schema } from "yup"

export class YupSilk<TSchema extends Schema>
  implements GraphQLSilk<InferType<TSchema>, InferType<TSchema>>
{
  _types?: { input: InferType<TSchema>; output: InferType<TSchema> }
  constructor(public schema: TSchema) {}

  getType() {
    return GraphQLString
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
