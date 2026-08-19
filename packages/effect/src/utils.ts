import { Option, type Schema, SchemaAST } from "effect"
import {
  asEnumType,
  asField,
  asObjectType,
  asUnionType,
  type EnumConfig,
  type FieldConfig,
  type ObjectConfig,
  type UnionConfig,
} from "./metadata"

const AUTO_DESCRIPTIONS = new Set([
  "a string",
  "a number",
  "an integer",
  "a boolean",
  "a valid Date",
  "a positive number",
])

const getAnnotationWithFallback = <T>(
  ast: SchemaAST.AST | SchemaAST.PropertySignature,
  symbolKey: symbol,
  stringKey: string
) =>
  SchemaAST.getAnnotation<T>(symbolKey)(ast).pipe(
    Option.orElse(() => SchemaAST.getAnnotation<T>(stringKey as any)(ast))
  )

/**
 * Get field configuration from an Effect Schema
 * Extracts both asField metadata and default values from annotations
 * Also checks PropertySignature annotations if provided
 */
export function getFieldConfig(
  schema: Schema.Schema.Any,
  propertySignature?: SchemaAST.PropertySignature
): FieldConfig {
  const safeGet = <T>(fn: () => T, fallback: T): T => {
    try {
      return fn()
    } catch {
      return fallback
    }
  }
  const unwrapped = unwrapAST(schema.ast)
  const unwrappedPropertyType =
    propertySignature && unwrapAST(propertySignature.type)
  if (
    unwrappedPropertyType &&
    (unwrappedPropertyType._tag === "Suspend" ||
      (unwrappedPropertyType._tag === "Union" &&
        unwrappedPropertyType.types.some((t) => t._tag === "Suspend")))
  ) {
    return {}
  }
  if (
    unwrapped._tag === "Suspend" ||
    (unwrapped._tag === "Union" &&
      unwrapped.types.some((t) => t._tag === "Suspend"))
  ) {
    return {}
  }
  // First check PropertySignature annotations (takes precedence)
  const propFieldConfig = propertySignature
    ? safeGet(
        () =>
          getAnnotationWithFallback<FieldConfig>(
            propertySignature,
            asField,
            "asField"
          ).pipe(Option.getOrElse(() => ({}) as FieldConfig)),
        {} as FieldConfig
      )
    : {}

  // Then check schema annotations
  const schemaFieldConfig = safeGet(
    () =>
      getAnnotationWithFallback<FieldConfig>(
        schema.ast,
        asField,
        "asField"
      ).pipe(Option.getOrElse(() => ({}) as FieldConfig)),
    {} as FieldConfig
  )

  // Merge configs, PropertySignature takes precedence
  const fieldConfig = { ...schemaFieldConfig, ...propFieldConfig }

  const description =
    SchemaAST.getDescriptionAnnotation(propertySignature ?? schema.ast).pipe(
      Option.getOrNull
    ) ?? SchemaAST.getDescriptionAnnotation(schema.ast).pipe(Option.getOrNull)
  const sanitizedDescription =
    description !== null && !AUTO_DESCRIPTIONS.has(description)
      ? description
      : null
  const deprecationReason =
    SchemaAST.getAnnotation<string>("deprecationReason" as any)(
      propertySignature ?? schema.ast
    ).pipe(Option.getOrNull) ??
    SchemaAST.getAnnotation<string>("deprecationReason" as any)(
      schema.ast
    ).pipe(Option.getOrNull)

  return {
    ...fieldConfig,
    ...(fieldConfig.description === undefined && sanitizedDescription !== null
      ? { description: sanitizedDescription }
      : {}),
    ...(fieldConfig.deprecationReason === undefined &&
    deprecationReason !== null
      ? { deprecationReason }
      : {}),
  }
}

/**
 * Get object type configuration from an Effect Schema
 */
export function getObjectConfig(schema: Schema.Schema.Any): ObjectConfig {
  const config = getAnnotationWithFallback<ObjectConfig>(
    schema.ast,
    asObjectType,
    "asObjectType"
  ).pipe(Option.getOrElse(() => ({}) as ObjectConfig))

  const title = SchemaAST.getTitleAnnotation(schema.ast).pipe(Option.getOrNull)
  const description = SchemaAST.getDescriptionAnnotation(schema.ast).pipe(
    Option.getOrNull
  )

  return {
    ...config,
    ...(config.name === undefined && title !== null ? { name: title } : {}),
    ...(config.description === undefined && description !== null
      ? { description }
      : {}),
  }
}

/**
 * Get enum type configuration from an Effect Schema
 */
export function getEnumConfig(schema: Schema.Schema.Any): EnumConfig {
  const config = getAnnotationWithFallback<EnumConfig>(
    schema.ast,
    asEnumType,
    "asEnumType"
  ).pipe(Option.getOrElse(() => ({}) as EnumConfig))

  const title = SchemaAST.getTitleAnnotation(schema.ast).pipe(Option.getOrNull)
  const description = SchemaAST.getDescriptionAnnotation(schema.ast).pipe(
    Option.getOrNull
  )

  return {
    ...config,
    ...(config.name === undefined && title !== null ? { name: title } : {}),
    ...(config.description === undefined && description !== null
      ? { description }
      : {}),
  }
}

/**
 * Get union type configuration from an Effect Schema
 */
export function getUnionConfig(schema: Schema.Schema.Any): UnionConfig {
  const config = getAnnotationWithFallback<UnionConfig>(
    schema.ast,
    asUnionType,
    "asUnionType"
  ).pipe(Option.getOrElse(() => ({}) as UnionConfig))

  const title = SchemaAST.getTitleAnnotation(schema.ast).pipe(Option.getOrNull)
  const description = SchemaAST.getDescriptionAnnotation(schema.ast).pipe(
    Option.getOrNull
  )

  return {
    ...config,
    ...(config.name === undefined && title !== null ? { name: title } : {}),
    ...(config.description === undefined && description !== null
      ? { description }
      : {}),
  }
}

/**
 * Check if a schema is a string schema
 */
export function isStringSchema(ast: SchemaAST.AST): boolean {
  if (ast._tag === "StringKeyword") return true
  if (ast._tag === "Transformation") {
    return isStringSchema(ast.to)
  }
  if (ast._tag === "Refinement") {
    return isStringSchema(ast.from)
  }
  return false
}

/**
 * Check if a string schema should be treated as a GraphQL ID
 */
export function isIDSchema(schema: Schema.Schema.Any): boolean {
  const ast = schema.ast
  // Check for UUID, ULID, or other ID-like transformations
  const identifier = SchemaAST.getAnnotation<string>(
    SchemaAST.IdentifierAnnotationId
  )(ast).pipe(Option.getOrNull)

  if (identifier) {
    const lowerIdentifier = identifier.toLowerCase()
    return (
      lowerIdentifier.includes("uuid") ||
      lowerIdentifier.includes("ulid") ||
      lowerIdentifier.includes("id") ||
      lowerIdentifier.includes("cuid")
    )
  }

  return false
}

/**
 * Check if a schema is a number schema
 */
export function isNumberSchema(ast: SchemaAST.AST): boolean {
  if (ast._tag === "NumberKeyword") return true
  if (ast._tag === "Transformation") {
    return isNumberSchema(ast.to)
  }
  if (ast._tag === "Refinement") {
    return isNumberSchema(ast.from)
  }
  return false
}

/**
 * Check if a number schema represents an integer
 */
export function isIntegerSchema(schema: Schema.Schema.Any): boolean {
  const ast = schema.ast

  // Check for integer-specific refinements or transformations
  const identifier = SchemaAST.getAnnotation<string>(
    SchemaAST.IdentifierAnnotationId
  )(ast).pipe(Option.getOrNull)

  if (identifier) {
    const lowerIdentifier = identifier.toLowerCase()
    return lowerIdentifier.includes("int")
  }

  // Check if it's a refinement with integer constraints
  if (ast._tag === "Refinement") {
    // Look for integer filters in the AST
    const jsonSchema = SchemaAST.getAnnotation<any>(
      SchemaAST.JSONSchemaAnnotationId
    )(ast).pipe(Option.getOrNull)

    if (jsonSchema?.type === "integer") return true
  }

  return false
}

/**
 * Check if a schema is a boolean schema
 */
export function isBooleanSchema(ast: SchemaAST.AST): boolean {
  if (ast._tag === "BooleanKeyword") return true
  if (ast._tag === "Transformation") {
    return isBooleanSchema(ast.to)
  }
  if (ast._tag === "Refinement") {
    return isBooleanSchema(ast.from)
  }
  return false
}

/**
 * Check if a schema is a literal schema
 */
export function isLiteralSchema(ast: SchemaAST.AST): ast is SchemaAST.Literal {
  return ast._tag === "Literal"
}

/**
 * Check if a schema is a struct (object) schema
 */
export function isStructSchema(
  ast: SchemaAST.AST
): ast is SchemaAST.TypeLiteral {
  return ast._tag === "TypeLiteral"
}

/**
 * Check if a schema is an enum schema
 */
export function isEnumSchema(ast: SchemaAST.AST): ast is SchemaAST.Enums {
  return ast._tag === "Enums"
}

/**
 * Check if a schema is a union schema
 */
export function isUnionSchema(ast: SchemaAST.AST): ast is SchemaAST.Union {
  return ast._tag === "Union"
}

/**
 * Check if a schema is a tuple or array schema
 */
export function isTupleOrArraySchema(
  ast: SchemaAST.AST
): ast is SchemaAST.TupleType {
  return unwrapAST(ast)._tag === "TupleType"
}

/**
 * Check if a schema is nullable or optional
 */
export function isNullable(ast: SchemaAST.AST): boolean {
  if (ast._tag === "Union") {
    return ast.types.some(
      (t) =>
        t._tag === "UndefinedKeyword" ||
        t._tag === "VoidKeyword" ||
        (t._tag === "Literal" &&
          (t.literal === null || t.literal === undefined))
    )
  }
  return false
}

/**
 * Unwrap AST to get the underlying type
 */
export function unwrapAST(ast: SchemaAST.AST): SchemaAST.AST {
  if (ast._tag === "Transformation") {
    return unwrapAST(ast.to)
  }
  if (ast._tag === "Refinement") {
    return unwrapAST(ast.from)
  }
  return ast
}

/**
 * Extract type name from __typename field if present
 * Looks for __typename: Schema.Literal("TypeName") pattern
 * Also handles __typename: Schema.NullOr(Schema.Literal("TypeName"))
 */
export function extractTypeName(
  ast: SchemaAST.TypeLiteral
): string | undefined {
  const typenameProp = ast.propertySignatures.find(
    (prop) => prop.name.toString() === "__typename"
  )

  if (!typenameProp) return undefined

  // Unwrap the property type to get to the literal
  const unwrapped = unwrapAST(typenameProp.type)

  // Check if it's a literal
  if (isLiteralSchema(unwrapped) && typeof unwrapped.literal === "string") {
    return unwrapped.literal
  }

  // Check if it's a union (from Schema.NullOr or Schema.optional)
  if (isUnionSchema(unwrapped)) {
    // Find the first string literal that's not null/undefined
    for (const type of unwrapped.types) {
      if (isLiteralSchema(type) && typeof type.literal === "string") {
        return type.literal
      }
    }
  }

  return undefined
}
