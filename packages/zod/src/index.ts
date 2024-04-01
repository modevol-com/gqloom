import { type GraphQLFabric, createLoom } from "@gqloom/core"
import { GraphQLString } from "graphql"
import type { Schema, input, output } from "zod"
import { z } from "zod"

export class ZodFabric<TSchema extends Schema>
  implements GraphQLFabric<output<TSchema>, input<TSchema>>
{
  _types?: { input: input<TSchema>; output: output<TSchema> }
  constructor(public schema: TSchema) {}

  getType() {
    return GraphQLString
  }

  parse(input: input<TSchema>): Promise<output<TSchema>> {
    return this.schema.parseAsync(input)
  }
}

export type ZodSchemaIO = [Schema, "_input", "_output"]

export function zodFabric<TSchema extends Schema>(
  schema: TSchema
): ZodFabric<TSchema> {
  return new ZodFabric(schema)
}

export const { query, mutation, field, resolver } = createLoom<ZodSchemaIO>(
  zodFabric,
  isZodSchema
)

function isZodSchema(target: any): target is Schema {
  return target instanceof z.ZodType
}
