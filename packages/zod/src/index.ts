import { type GraphQLSilk, createLoom, mapValue } from "@gqloom/core"
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
  type input,
  type output,
  ZodEnum,
  ZodNativeEnum,
  type EnumLike,
  ZodUnion,
  type ZodTypeAny,
  ZodDiscriminatedUnion,
  ZodLiteral,
} from "zod"
import { ZodIDKinds } from "./constants"
import {
  parseFieldConfig,
  parseObjectConfig,
  resolveTypeByDiscriminatedUnion,
} from "./utils"

export class ZodSilk<TSchema extends Schema>
  implements GraphQLSilk<output<TSchema>, input<TSchema>>
{
  _types?: { input: input<TSchema>; output: output<TSchema> }
  constructor(public schema: TSchema) {}

  getGraphQLType() {
    return ZodSilk.toNullableGraphQLType(this.schema)
  }

  static toNullableGraphQLType(schema: Schema): GraphQLOutputType {
    const nullable = (ofType: GraphQLOutputType) => {
      const isNonNull = !schema.isNullable() && !schema.isOptional()
      if (!isNonNull) return ofType
      if (isNonNullType(ofType)) return ofType
      return new GraphQLNonNull(ofType)
    }
    return nullable(ZodSilk.toGraphQLType(schema))
  }

  static toGraphQLType(schema: Schema): GraphQLOutputType {
    if (schema instanceof ZodOptional || schema instanceof ZodNullable) {
      return ZodSilk.toGraphQLType(schema.unwrap())
    }

    if (schema instanceof ZodArray) {
      return new GraphQLList(ZodSilk.toNullableGraphQLType(schema.element))
    }

    if (schema instanceof ZodString) {
      if (schema._def.checks.some((ch) => ZodIDKinds.has(ch.kind)))
        return GraphQLID
      return GraphQLString
    }

    if (schema instanceof ZodLiteral) {
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

    if (schema instanceof ZodObject) {
      if (!schema.description) throw new Error("Object must have a name")
      const configFromDescription = parseObjectConfig(schema.description)
      return new GraphQLObjectType({
        ...configFromDescription,
        fields: mapValue(schema.shape as ZodRawShape, (field) => {
          return {
            type: ZodSilk.toNullableGraphQLType(field),
            ...parseFieldConfig(field.description),
          }
        }),
      })
    }

    if (schema instanceof ZodEnum || schema instanceof ZodNativeEnum) {
      if (!schema.description) throw new Error("Enum must have a name")
      const { name, description } = parseObjectConfig(schema.description)
      const values: GraphQLEnumValueConfigMap = {}

      if ("options" in schema) {
        for (const value of schema.options as string[]) {
          values[value] = { value }
        }
      } else {
        Object.entries(schema.enum as EnumLike).forEach(([key, value]) => {
          if (typeof schema.enum?.[schema.enum[key]] === "number") return
          values[key] = { value }
        })
      }

      return new GraphQLEnumType({ name, description, values })
    }

    if (schema instanceof ZodUnion || schema instanceof ZodDiscriminatedUnion) {
      if (!schema.description) throw new Error("Union must have a name")
      const types = (schema.options as ZodTypeAny[]).map((s) => {
        const gqlType = ZodSilk.toGraphQLType(s)
        if (isObjectType(gqlType)) return gqlType
        throw new Error(
          `Union types ${name} can only contain objects, but got ${gqlType}`
        )
      })

      return new GraphQLUnionType({
        resolveType:
          schema instanceof ZodDiscriminatedUnion
            ? resolveTypeByDiscriminatedUnion(schema)
            : undefined,
        types,
        ...parseObjectConfig(schema.description),
      })
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
