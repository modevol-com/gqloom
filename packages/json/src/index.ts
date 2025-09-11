import {
  type GraphQLSilk,
  LoomObjectType,
  SYMBOLS,
  type StandardSchemaV1,
  mapValue,
  weaverContext,
} from "@gqloom/core"
import {
  GraphQLBoolean,
  GraphQLEnumType,
  type GraphQLEnumValueConfigMap,
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  type GraphQLOutputType,
  GraphQLString,
  GraphQLUnionType,
  isNonNullType,
  isObjectType,
} from "graphql"
import type { FromSchema, JSONSchema } from "json-schema-to-ts"
import type { JSONWeaverConfig } from "./types"

export class JSONWeaver {
  public static vendor = "json"

  /**
   * get GraphQL Silk from JSON Schema
   * @param schema JSON Schema
   * @returns GraphQL Silk Like JSON Schema
   */
  public static unravel<
    const TSchema extends JSONSchema,
    TData = FromSchema<TSchema>,
  >(schema: TSchema): JSONSilk<TSchema, TData> {
    const config =
      weaverContext.value?.getConfig<JSONWeaverConfig>("gqloom.json")

    Object.defineProperty(schema, "~standard", {
      value: {
        version: 1,
        vendor: "gqloom.json",
        validate: (value: unknown) => ({ value: value as TData }),
      } satisfies StandardSchemaV1.Props<TData, TData>,
      enumerable: false,
    })

    Object.defineProperty(schema, SYMBOLS.GET_GRAPHQL_TYPE, {
      value: config
        ? function (this: JSONSchema) {
            return weaverContext.useConfig(config, () =>
              JSONWeaver.getGraphQLTypeBySelf.call(this)
            )
          }
        : JSONWeaver.getGraphQLTypeBySelf,
      enumerable: false,
    })
    return schema as JSONSilk<TSchema, TData>
  }

  public static getGraphQLType(schema: JSONSchema): GraphQLOutputType {
    return JSONWeaver.toNullableGraphQLType(schema)
  }

  protected static getGraphQLTypeBySelf(this: JSONSchema): GraphQLOutputType {
    return JSONWeaver.toNullableGraphQLType(this)
  }

  protected static toNullableGraphQLType(
    schema: JSONSchema
  ): GraphQLOutputType {
    if (typeof schema === "boolean") {
      throw new Error("Boolean JSON schemas are not supported")
    }
    const gqlType = JSONWeaver.toMemoriedGraphQLType(schema)

    const type = schema.type
    const isNullable =
      typeof schema.default === "undefined" &&
      Array.isArray(type) &&
      type.includes("null")

    if (isNullable) {
      return isNonNullType(gqlType) ? gqlType.ofType : gqlType
    }

    return isNonNullType(gqlType) ? gqlType : new GraphQLNonNull(gqlType)
  }

  protected static toMemoriedGraphQLType(
    schema: JSONSchema
  ): GraphQLOutputType {
    if (typeof schema === "boolean") {
      throw new Error("Boolean JSON schemas are not supported")
    }
    const existing = weaverContext.getGraphQLType(schema)
    if (existing) return existing
    const gqlType = JSONWeaver.toGraphQLTypeInner(schema)
    return weaverContext.memoGraphQLType(schema, gqlType)
  }

  protected static toGraphQLTypeInner(schema: JSONSchema): GraphQLOutputType {
    if (typeof schema === "boolean") {
      throw new Error("Boolean JSON schemas are not supported")
    }
    if (schema.oneOf || schema.anyOf) {
      const schemas = schema.oneOf ?? schema.anyOf!
      const name = schema.title ?? schema.$id
      if (!name) {
        throw new Error("Union type must have a name (from title or $id)")
      }
      return new GraphQLUnionType({
        name,
        description: schema.description,
        types: () =>
          schemas.map((s) => {
            const gqlType = JSONWeaver.toMemoriedGraphQLType(s as JSONSchema)
            if (!isObjectType(gqlType)) {
              throw new Error(
                `Union type member of ${name} must be an object type`
              )
            }
            return gqlType
          }),
      })
    }

    const type = Array.isArray(schema.type)
      ? schema.type.find((t) => t !== "null")
      : schema.type

    if (schema.enum) {
      const name = schema.title ?? schema.$id
      if (!name) {
        throw new Error("Enum type must have a name (from title or $id)")
      }
      const values: GraphQLEnumValueConfigMap = {}
      for (const value of schema.enum as (string | number)[]) {
        if (typeof value === "string" || typeof value === "number") {
          const key = String(value).replace(/[^_a-zA-Z0-9]/g, "_")
          values[key] = { value }
        }
      }
      return new GraphQLEnumType({
        name,
        description: schema.description,
        values,
      })
    }

    switch (type) {
      case "string":
        return GraphQLString
      case "number":
        return GraphQLFloat
      case "integer":
        return GraphQLInt
      case "boolean":
        return GraphQLBoolean
      case "array": {
        if (
          !schema.items ||
          typeof schema.items !== "object" ||
          Array.isArray(schema.items)
        ) {
          throw new Error("Array schema must have a single object in 'items'")
        }
        const itemType = JSONWeaver.toNullableGraphQLType(
          schema.items as JSONSchema
        )
        return new GraphQLList(itemType)
      }
      case "object": {
        const name = schema.title ?? schema.$id ?? LoomObjectType.AUTO_ALIASING

        return new GraphQLObjectType({
          name,
          description: schema.description,
          fields: () =>
            mapValue(schema.properties ?? {}, (propSchema, key) => {
              if (key.startsWith("__")) return mapValue.SKIP

              const fieldSchema = propSchema as JSONSchema
              if (typeof fieldSchema === "boolean") {
                throw new Error(
                  "Boolean JSON schemas are not supported in properties"
                )
              }
              let fieldType = JSONWeaver.toMemoriedGraphQLType(fieldSchema)

              const isRequired = schema.required?.includes(key as string)

              if (isRequired) {
                if (!isNonNullType(fieldType)) {
                  fieldType = new GraphQLNonNull(fieldType)
                }
              } else if (isNonNullType(fieldType)) {
                fieldType = fieldType.ofType
              }

              return {
                type: fieldType,
                description: fieldSchema.description,
                defaultValue: fieldSchema.default,
              }
            }),
        })
      }
      case "null":
        throw new Error(
          "Standalone 'null' type is not supported in GraphQL. It can only be used in a union type, like ['string', 'null']"
        )
    }
    throw new Error(`Unsupported JSON schema type: ${String(type)}`)
  }
}

export type JSONSilk<
  TSchema extends JSONSchema,
  TData = FromSchema<TSchema>,
> = TSchema & GraphQLSilk<TData, TData>

export function jsonSilk<
  const TSchema extends JSONSchema,
  TData = FromSchema<TSchema>,
>(schema: TSchema): JSONSilk<TSchema, TData> {
  return JSONWeaver.unravel(schema) as any
}
