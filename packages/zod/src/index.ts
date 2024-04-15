import { type GraphQLSilk, createLoom } from "@gqloom/core"
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
} from "graphql"
import {
  ZodArray,
  ZodBoolean,
  ZodDate,
  ZodNullable,
  ZodNumber,
  ZodOptional,
  ZodString,
  ZodType,
  type Schema,
  type input,
  type output,
} from "zod"
import { ZodIDKinds } from "./constants"

export class ZodSilk<TSchema extends Schema>
  implements GraphQLSilk<output<TSchema>, input<TSchema>>
{
  _types?: { input: input<TSchema>; output: output<TSchema> }
  constructor(public schema: TSchema) {}

  getType() {
    return ZodSilk.getTypeBySchema(this.schema)
  }

  static getTypeBySchema(schema: Schema): GraphQLOutputType {
    const nullable = (ofType: GraphQLOutputType) => {
      const isNonNull = !schema.isNullable() && !schema.isOptional()
      if (!isNonNull) return ofType
      if (isNonNullType(ofType)) return ofType
      return new GraphQLNonNull(ofType)
    }
    return nullable(ZodSilk.getGraphQLType(schema))
  }

  static getGraphQLType(schema: Schema): GraphQLOutputType {
    if (schema instanceof ZodOptional || schema instanceof ZodNullable) {
      return ZodSilk.getGraphQLType(schema.unwrap())
    }

    if (schema instanceof ZodArray) {
      return new GraphQLList(ZodSilk.getTypeBySchema(schema.element))
    }

    if (schema instanceof ZodString) {
      if (schema._def.checks.some((ch) => ZodIDKinds.includes(ch.kind)))
        return GraphQLID
      return GraphQLString
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

    throw new Error(`zod type ${schema.constructor.name} is not supported`)
  }

  parse(input: input<TSchema>): Promise<output<TSchema>> {
    return this.schema.parseAsync(input)
  }
}

export type ZodSchemaIO = [Schema, "_input", "_output"]

export function zodSilk<TSchema extends Schema>(
  schema: TSchema
): ZodSilk<TSchema> {
  return new ZodSilk(schema)
}

export const { query, mutation, field, resolver } = createLoom<ZodSchemaIO>(
  zodSilk,
  isZodSchema
)

function isZodSchema(target: any): target is Schema {
  return target instanceof ZodType
}
