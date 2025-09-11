import {
  type GraphQLSilk,
  LoomObjectType,
  SYMBOLS,
  type StandardSchemaV1,
  ensureInterfaceType,
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
import type { JSONWeaverConfig, JSONWeaverConfigOptions } from "./types"

export class JSONWeaver {
  public static vendor = "json"

  /**
   * Create a JSON weaver config object
   * @param config JSON weaver config options
   * @returns a JSON weaver config object
   */
  public static config = function (
    config: JSONWeaverConfigOptions
  ): JSONWeaverConfig {
    return {
      ...config,
      [SYMBOLS.WEAVER_CONFIG]: "gqloom.json",
    }
  }

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

    const config =
      weaverContext.value?.getConfig<JSONWeaverConfig>("gqloom.json")
    const presetType = config?.presetGraphQLType?.(schema)
    if (presetType) return presetType

    // Handle allOf - creates interfaces and implementing objects
    if (schema.allOf) {
      const name = schema.title ?? schema.$id
      if (!name) {
        throw new Error("allOf schema must have a name (from title or $id)")
      }

      // Find the first schema that could be an interface (has title and properties)
      const interfaceSchema = schema.allOf.find((s) => {
        const subSchema = s as JSONSchema
        return (
          typeof subSchema === "object" &&
          subSchema.title &&
          subSchema.properties
        )
      }) as JSONSchema | undefined

      if (interfaceSchema && typeof interfaceSchema === "object") {
        // Create interface object type first, then convert to interface
        const interfaceObjectType =
          JSONWeaver.toMemoriedGraphQLType(interfaceSchema)
        const interfaceType = ensureInterfaceType(interfaceObjectType)

        // Merge all schemas to create the implementing object
        const mergedProperties: Record<string, any> = {}
        const mergedRequired: string[] = []

        for (const subSchema of schema.allOf) {
          const s = subSchema as JSONSchema
          if (typeof s === "object" && s.properties) {
            Object.assign(mergedProperties, s.properties)
            if (s.required) {
              mergedRequired.push(...s.required)
            }
          }
        }

        // Create the merged schema and reuse existing object logic
        const mergedSchema: JSONSchema = {
          title: name,
          type: "object",
          properties: mergedProperties,
          required: mergedRequired,
          description: schema.description,
        }

        // Create the object type using existing logic
        const objectType = JSONWeaver.toGraphQLTypeInner(
          mergedSchema
        ) as GraphQLObjectType

        // Return new object type with interface
        return new GraphQLObjectType({
          ...objectType.toConfig(),
          interfaces: [interfaceType],
        })
      }
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
