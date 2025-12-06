import {
  AUTO_ALIASING,
  ensureInterfaceType,
  mapValue,
  SYMBOLS,
  weave,
  weaverContext,
} from "@gqloom/core"
import { Option, Schema, SchemaAST } from "effect"
import {
  type GraphQLArgumentConfig,
  GraphQLBoolean,
  GraphQLEnumType,
  type GraphQLEnumValueConfigMap,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  type GraphQLInterfaceType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  type GraphQLOutputType,
  GraphQLString,
  GraphQLUnionType,
  isInterfaceType,
  isNonNullType,
  isObjectType,
} from "graphql"
import type {
  EffectWeaverConfig,
  EffectWeaverConfigOptions,
  FieldConfig,
} from "./types"
import {
  extractTypeName,
  getEnumConfig,
  getFieldConfig,
  getObjectConfig,
  getUnionConfig,
  isBooleanSchema,
  isEnumSchema,
  isIDSchema,
  isIntegerSchema,
  isLiteralSchema,
  isNullable,
  isNumberSchema,
  isStringSchema,
  isStructSchema,
  isTupleOrArraySchema,
  isUnionSchema,
  unwrapAST,
} from "./utils"

export class EffectWeaver {
  public static vendor = "effect"

  /**
   * Weave a GraphQL Schema from resolvers with Effect schema
   * @param inputs Resolvers, Global Middlewares, WeaverConfigs Or SchemaWeaver
   * @returns GraphQL Schema
   */
  public static weave(...inputs: Parameters<typeof weave>) {
    return weave(EffectWeaver, ...inputs)
  }

  protected static toNullableGraphQLType(
    schema: Schema.Schema.Any
  ): GraphQLOutputType {
    const ast = schema.ast

    // Check for custom type from metadata - if custom type is set, use it as-is
    const customType = (getFieldConfig(schema) as FieldConfig | undefined)?.type
    if (customType) return customType

    const gqlType = EffectWeaver.toMemoriedGraphQLType(schema)

    // Check if the schema is nullable
    if (isNullable(ast)) return gqlType

    if (isNonNullType(gqlType)) return gqlType
    return new GraphQLNonNull(gqlType)
  }

  protected static toMemoriedGraphQLType(
    schema: Schema.Schema.Any
  ): GraphQLOutputType {
    const existing = weaverContext.getGraphQLType(schema.ast)
    if (existing) return existing
    const gqlType = EffectWeaver.toGraphQLType(schema)
    return weaverContext.memoGraphQLType(schema.ast, gqlType)
  }

  protected static toGraphQLType(schema: Schema.Schema.Any): GraphQLOutputType {
    // Check for custom type from metadata
    const customType = (getFieldConfig(schema) as FieldConfig | undefined)?.type
    if (customType) return customType

    // Check for preset type from weaver config
    const preset = weaverContext.getConfig<EffectWeaverConfig>("gqloom.effect")
    const presetType = preset?.presetGraphQLType?.(schema)
    if (presetType) return presetType

    const ast = unwrapAST(schema.ast)

    if (ast._tag === "Suspend") {
      return EffectWeaver.toMemoriedGraphQLType(Schema.make(ast.f()))
    }

    // Handle tuple/array types
    if (isTupleOrArraySchema(ast)) {
      // For tuples with a single element type (e.g., ReadonlyArray)
      if (ast.elements.length === 1 && ast.rest.length === 0) {
        const elementType = Schema.make(ast.elements[0].type)
        return new GraphQLList(EffectWeaver.toNullableGraphQLType(elementType))
      }
      // For rest array (e.g., Schema.Array)
      if (ast.rest.length > 0) {
        const elementType = Schema.make(ast.rest[0].type)
        return new GraphQLList(EffectWeaver.toNullableGraphQLType(elementType))
      }
      // For fixed tuples, use the first element type (or throw error)
      if (ast.elements.length > 0) {
        const elementType = Schema.make(ast.elements[0].type)
        return new GraphQLList(EffectWeaver.toNullableGraphQLType(elementType))
      }
    }

    // Handle string types
    if (isStringSchema(ast)) {
      if (isIDSchema(schema)) return GraphQLID
      return GraphQLString
    }

    // Handle literal types
    if (isLiteralSchema(ast)) {
      switch (typeof ast.literal) {
        case "boolean":
          return GraphQLBoolean
        case "number":
          return GraphQLFloat
        case "string":
        default:
          return GraphQLString
      }
    }

    // Handle number types
    if (isNumberSchema(ast)) {
      if (isIntegerSchema(schema)) return GraphQLInt
      return GraphQLFloat
    }

    // Handle boolean types
    if (isBooleanSchema(ast)) {
      return GraphQLBoolean
    }

    // Handle Date types (represented as strings in GraphQL)
    if (ast._tag === "Transformation" || ast._tag === "Declaration") {
      const identifier = SchemaAST.getAnnotation<string>(
        SchemaAST.IdentifierAnnotationId
      )(ast).pipe((option) => (option._tag === "Some" ? option.value : null))

      if (identifier === "Date" || identifier?.includes("Date")) {
        return GraphQLString
      }
    }

    // Handle struct (object) types
    if (isStructSchema(ast)) {
      const objectConfigFromMetadata = getObjectConfig(schema)

      // Try to extract type name from __typename field if not explicitly set
      const extractedName = extractTypeName(ast)
      const name =
        objectConfigFromMetadata.name ?? extractedName ?? AUTO_ALIASING

      const { interfaces, ...objectConfig } = objectConfigFromMetadata

      const existed = weaverContext.getGraphQLType<GraphQLObjectType>(ast)
      if (existed) return existed

      const gqlObj = new GraphQLObjectType({
        name,
        interfaces: interfaces?.map((i) =>
          isInterfaceType(i) ? i : EffectWeaver.ensureInterfaceType(i)
        ),
        fields: () =>
          mapValue(
            ast.propertySignatures.reduce(
              (acc, prop) => {
                if (prop.name.toString().startsWith("__")) return acc
                acc[prop.name.toString()] = {
                  schema: Schema.make(prop.type),
                  propertySignature: prop,
                }
                return acc
              },
              {} as Record<
                string,
                {
                  schema: Schema.Schema.Any
                  propertySignature: SchemaAST.PropertySignature
                }
              >
            ),
            (fieldData, key) => {
              if (key.startsWith("__")) return mapValue.SKIP
              const { schema: field, propertySignature } = fieldData
              const unwrappedFieldAst = unwrapAST(field.ast)
              if (unwrappedFieldAst._tag === "Suspend") {
                return {
                  type: EffectWeaver.toNullableGraphQLType(
                    Schema.make(unwrappedFieldAst.f())
                  ),
                }
              }
              if (unwrappedFieldAst._tag === "Union") {
                const suspendType = unwrappedFieldAst.types.find(
                  (t) => t._tag === "Suspend"
                ) as SchemaAST.Suspend | undefined
                if (suspendType) {
                  return {
                    type: EffectWeaver.toNullableGraphQLType(
                      Schema.make(suspendType.f())
                    ),
                  }
                }
              }
              const { type, ...fieldConfig } = getFieldConfig(
                field,
                propertySignature
              )
              if (type === null || type === SYMBOLS.FIELD_HIDDEN)
                return mapValue.SKIP

              // Extract default value from property signature annotations
              const defaultValue = SchemaAST.getDefaultAnnotation(
                propertySignature
              ).pipe(Option.getOrUndefined)

              return {
                type: type ?? EffectWeaver.toNullableGraphQLType(field),
                ...fieldConfig,
                ...(defaultValue !== undefined && {
                  extensions: {
                    ...fieldConfig.extensions,
                    defaultValue,
                  },
                }),
              }
            }
          ),
        ...objectConfig,
      })

      return weaverContext.memoGraphQLType(ast, gqlObj)
    }

    // Handle enum types
    if (isEnumSchema(ast)) {
      const {
        name = AUTO_ALIASING,
        valuesConfig,
        ...enumConfig
      } = getEnumConfig(schema)

      const values: GraphQLEnumValueConfigMap = {}

      ast.enums.forEach(([key, value]) => {
        // Use the value as the GraphQL enum name (e.g., "ACTIVE")
        // valuesConfig is keyed by the key (e.g., "Active")
        values[value] = { value, ...valuesConfig?.[key] }
      })

      const existed = weaverContext.getGraphQLType<GraphQLEnumType>(ast)
      if (existed) return existed

      const gqlEnum = new GraphQLEnumType({
        name,
        values,
        ...enumConfig,
      })

      return weaverContext.memoGraphQLType(ast, gqlEnum)
    }

    // Handle union types
    if (isUnionSchema(ast)) {
      // Filter out undefined/void/null types
      const nonNullTypes = ast.types.filter(
        (t) =>
          t._tag !== "UndefinedKeyword" &&
          t._tag !== "VoidKeyword" &&
          !(
            t._tag === "Literal" &&
            (t.literal === null || t.literal === undefined)
          )
      )

      // If there's only one non-null type left, unwrap it
      if (nonNullTypes.length === 1) {
        const innerSchema = Schema.make(nonNullTypes[0])
        const innerType = EffectWeaver.toMemoriedGraphQLType(innerSchema)
        return weaverContext.memoGraphQLType(schema, innerType)
      }

      // Otherwise, create a GraphQL union type
      const { name = AUTO_ALIASING, ...unionConfig } = getUnionConfig(schema)

      const types = nonNullTypes.map((t) => {
        const gqlType = EffectWeaver.toMemoriedGraphQLType(Schema.make(t))
        if (isObjectType(gqlType)) return gqlType
        throw new Error(
          `Union types ${name ?? "(unnamed)"} can only contain objects, but got ${gqlType}`
        )
      })

      const existed = weaverContext.getGraphQLType<GraphQLUnionType>(ast)
      if (existed) return existed

      const gqlUnion = new GraphQLUnionType({
        types,
        name,
        ...unionConfig,
      })

      return weaverContext.memoGraphQLType(ast, gqlUnion)
    }

    throw new Error(
      `Effect schema type ${ast._tag} is not supported. Schema: ${JSON.stringify(ast)}`
    )
  }

  public static ensureInterfaceType(
    item: GraphQLInterfaceType | Schema.Schema.Any
  ): GraphQLInterfaceType {
    if (isInterfaceType(item)) return item
    const gqlType = EffectWeaver.toMemoriedGraphQLType(item)

    return ensureInterfaceType(gqlType)
  }

  /**
   * Create an Effect weaver config object
   * @param config Effect weaver config options
   * @returns an Effect weaver config object
   */
  public static config = function (
    config: EffectWeaverConfigOptions
  ): EffectWeaverConfig {
    return {
      ...config,
      vendorWeaver: EffectWeaver,
      [SYMBOLS.WEAVER_CONFIG]: "gqloom.effect",
    }
  }

  public static getGraphQLType(schema: Schema.Schema.Any): GraphQLOutputType {
    return EffectWeaver.toNullableGraphQLType(schema)
  }

  public static getGraphQLArgumentConfig(
    schema: Schema.Schema.Any
  ): Omit<GraphQLArgumentConfig, "type" | "astNode"> | undefined {
    return getFieldConfig(schema)
  }

  protected static getGraphQLTypeBySelf(
    this: Schema.Schema.Any
  ): GraphQLOutputType {
    return EffectWeaver.toNullableGraphQLType(this)
  }
}

export * from "./metadata"
export * from "./types"
