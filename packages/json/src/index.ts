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

    if (typeof schema === "object" && !("~standard" in schema)) {
      Object.defineProperty(schema, "~standard", {
        value: {
          version: 1,
          vendor: "gqloom.json",
          validate: (value: unknown) => ({ value: value as TData }),
        } satisfies StandardSchemaV1.Props<TData, TData>,
        enumerable: false,
      })
    }

    if (typeof schema === "object" && !(SYMBOLS.GET_GRAPHQL_TYPE in schema)) {
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
    }
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
      typeof schema.default !== "undefined" ||
      (Array.isArray(type) && type.includes("null")) ||
      [...(schema.anyOf ?? []), ...(schema.oneOf ?? [])].some(
        (s) => typeof s === "object" && s && s.type === "null"
      )

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

    const name =
      schema.title ??
      weaverContext.names.get(schema) ??
      JSONWeaver.getTypeName(schema)

    const existing =
      weaverContext.getGraphQLType(schema) ??
      (name ? weaverContext.getNamedType(name) : undefined)
    if (existing) return existing
    const gqlType = JSONWeaver.toGraphQLTypeInner(schema)
    if (name) weaverContext.memoNamedType(gqlType)
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
      // Find all schemas that could be interfaces (have title and properties)
      const interfaceSchemas = schema.allOf.filter((s) => {
        const subSchema = s as JSONSchema
        return (
          typeof subSchema === "object" &&
          subSchema.title &&
          subSchema.properties
        )
      }) as JSONSchema[]

      // Always merge all schemas in allOf
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
        title: schema.title,
        type: "object",
        properties: mergedProperties,
        required: mergedRequired,
        description: schema.description,
      }

      // Create the object type using existing logic
      const objectType = JSONWeaver.toGraphQLTypeInner(
        mergedSchema
      ) as GraphQLObjectType

      // If there are interfaces, create object type with interfaces
      if (interfaceSchemas.length > 0) {
        // Create interface types for all interface schemas
        const interfaceTypes = interfaceSchemas.map((interfaceSchema) => {
          const interfaceObjectType =
            JSONWeaver.toMemoriedGraphQLType(interfaceSchema)
          return ensureInterfaceType(interfaceObjectType)
        })

        return new GraphQLObjectType({
          ...objectType.toConfig(),
          interfaces: interfaceTypes,
        })
      }

      // If no interfaces, just return the merged object type
      return objectType
    }

    if (schema.oneOf || schema.anyOf) {
      const schemas = (schema.oneOf ?? schema.anyOf!).filter((s) => {
        const subSchema = s as JSONSchema
        if (typeof subSchema !== "object" || !subSchema) return true
        return subSchema.type !== "null"
      })

      if (schemas.length === 1) {
        const unwrappedSchema = {
          ...(schemas[0] as object),
          // Carry over parent schema's metadata
          title: schema.title,
          $id: schema.$id,
          description: schema.description,
        }
        return JSONWeaver.toGraphQLTypeInner(unwrappedSchema)
      }

      const name = schema.title ?? weaverContext.names.get(schema)
      if (!name) {
        throw new Error("Union type must have a name")
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
      const name = schema.title ?? weaverContext.names.get(schema)
      if (!name) {
        throw new Error("Enum type must have a name")
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
        const name =
          schema.title ??
          weaverContext.names.get(schema) ??
          JSONWeaver.getTypeName(schema) ??
          LoomObjectType.AUTO_ALIASING

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

  protected static getTypeName(schema: JSONSchema): string | undefined {
    if (typeof schema !== "object") return undefined
    if (!schema.properties?.__typename) return undefined
    const typenameSchema = schema.properties?.__typename as JSONSchema
    if (
      typeof typenameSchema === "object" &&
      typenameSchema.const &&
      typeof typenameSchema.const === "string"
    )
      return typenameSchema.const
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

export type { JSONSchema, FromSchema }
