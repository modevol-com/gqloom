import { Option, type Schema, SchemaAST } from "effect"
import {
  AS_ENUM_TYPE,
  AS_FIELD,
  AS_OBJECT_TYPE,
  AS_UNION_TYPE,
} from "./metadata"
import type {
  EnumConfig,
  FieldConfig,
  ObjectConfig,
  UnionConfig,
} from "./types"

/**
 * Get field configuration from an Effect Schema
 * Extracts both AS_FIELD metadata and default values from annotations
 */
export function getFieldConfig(schema: Schema.Schema.Any): FieldConfig {
  const fieldConfig = SchemaAST.getAnnotation<FieldConfig>(AS_FIELD)(
    schema.ast
  ).pipe(Option.getOrElse(() => ({}) as FieldConfig))

  // Extract default value from schema annotations if present
  const defaultValue = schema.ast.annotations?.default

  if (defaultValue !== undefined) {
    return {
      ...fieldConfig,
      extensions: {
        ...fieldConfig.extensions,
        defaultValue,
      },
    }
  }

  return fieldConfig
}

/**
 * Get object type configuration from an Effect Schema
 */
export function getObjectConfig(schema: Schema.Schema.Any): ObjectConfig {
  return SchemaAST.getAnnotation<ObjectConfig>(AS_OBJECT_TYPE)(schema.ast).pipe(
    Option.getOrElse(() => ({}) as ObjectConfig)
  )
}

/**
 * Get enum type configuration from an Effect Schema
 */
export function getEnumConfig(schema: Schema.Schema.Any): EnumConfig {
  return SchemaAST.getAnnotation<EnumConfig>(AS_ENUM_TYPE)(schema.ast).pipe(
    Option.getOrElse(() => ({}) as EnumConfig)
  )
}

/**
 * Get union type configuration from an Effect Schema
 */
export function getUnionConfig(schema: Schema.Schema.Any): UnionConfig {
  return SchemaAST.getAnnotation<UnionConfig>(AS_UNION_TYPE)(schema.ast).pipe(
    Option.getOrElse(() => ({}) as UnionConfig)
  )
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
  return ast._tag === "TupleType"
}

/**
 * Check if a schema is nullable or optional
 */
export function isNullable(ast: SchemaAST.AST): boolean {
  // Handle PropertySignatureDeclaration (created by Schema.optional())
  if (ast._tag === "PropertySignatureDeclaration") {
    const prop = ast as SchemaAST.PropertySignatureDeclaration
    // Schema.optional() always makes the field nullable
    if (prop.isOptional) return true
    // Also check the inner type
    return isNullable(prop.type)
  }

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
 * Unwrap transformation schemas to get the underlying type
 */
export function unwrapTransformation(ast: SchemaAST.AST): SchemaAST.AST {
  if (ast._tag === "Transformation") {
    return unwrapTransformation(ast.to)
  }
  if (ast._tag === "Refinement") {
    return unwrapTransformation(ast.from)
  }
  // Handle PropertySignatureDeclaration (created by Schema.optional())
  if (ast._tag === "PropertySignatureDeclaration") {
    return unwrapTransformation((ast as SchemaAST.PropertySignatureDeclaration).type)
  }
  return ast
}
