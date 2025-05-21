import { deepMerge, weaverContext } from "@gqloom/core"
import type {
  GraphQLObjectTypeConfig,
  GraphQLObjectTypeExtensions,
  GraphQLTypeResolver,
  GraphQLUnionTypeConfig,
} from "graphql"
import type {
  util,
  $ZodArray,
  $ZodBoolean,
  $ZodDate,
  $ZodDefault,
  $ZodDiscriminatedUnion,
  $ZodEnum,
  $ZodLiteral,
  $ZodNullable,
  $ZodNumber,
  $ZodObject,
  $ZodOptional,
  $ZodShape,
  $ZodString,
  $ZodType,
  $ZodUnion,
} from "zod/v4/core"
import { ZodWeaver } from "."
import { asEnumType, asField, asObjectType, asUnionType } from "./metadata"
import type {
  EnumConfig,
  FieldConfig,
  ObjectConfig,
  UnionConfig,
} from "./types"

function matchDiscriminators(
  input: any,
  discs: util.DiscriminatorMap
): boolean {
  let matched = true
  for (const [key, value] of discs) {
    const data = input?.[key]

    if (value.values.size && !value.values.has(data)) {
      matched = false
    }
    if (value.maps.length > 0) {
      for (const m of value.maps) {
        if (!matchDiscriminators(data, m)) {
          matched = false
        }
      }
    }
  }

  return matched
}

export function resolveTypeByDiscriminatedUnion(
  schema: $ZodDiscriminatedUnion
): GraphQLTypeResolver<any, any> {
  return (data) => {
    const def = schema._zod.def
    const filteredOptions: $ZodType[] = []
    for (const option of def.options) {
      if (option._zod.disc) {
        if (matchDiscriminators(data, option._zod.disc)) {
          filteredOptions.push(option)
        }
      } else {
        // no discriminator
        filteredOptions.push(option)
      }
    }
    return getObjectConfig(filteredOptions[0] as $ZodObject).name
  }
}

export function isZodType(schema: unknown): schema is $ZodType {
  if (typeof schema !== "object" || schema === null) return false
  return "_zod" in schema
}

export function isZodArray(schema: unknown): schema is $ZodArray {
  return isZodType(schema) && schema._zod.def.type === "array"
}

export function isZodDefault(schema: unknown): schema is $ZodDefault {
  return isZodType(schema) && schema._zod.def.type === "default"
}

export function isZodNumber(schema: unknown): schema is $ZodNumber {
  return isZodType(schema) && schema._zod.def.type === "number"
}

export function isZodInt(schema: $ZodNumber): boolean {
  return (
    isZodNumber(schema) &&
    "format" in schema._zod.def &&
    (schema._zod.def.format === "safeint" ||
      schema._zod.def.format === "int32" ||
      schema._zod.def.format === "uint32")
  )
}

export function isZodString(schema: unknown): schema is $ZodString {
  return isZodType(schema) && schema._zod.def.type === "string"
}

export function isID(schema: $ZodString): boolean {
  return (
    isZodString(schema) &&
    "format" in schema._zod.def &&
    (schema._zod.def.format === "uuid" ||
      schema._zod.def.format === "guid" ||
      schema._zod.def.format === "nanoid" ||
      schema._zod.def.format === "cuid" ||
      schema._zod.def.format === "cuid2" ||
      schema._zod.def.format === "ulid")
  )
}

export function isZodLiteral(schema: unknown): schema is $ZodLiteral {
  return isZodType(schema) && schema._zod.def.type === "literal"
}

export function isZodBoolean(schema: unknown): schema is $ZodBoolean {
  return isZodType(schema) && schema._zod.def.type === "boolean"
}

export function isZodDate(schema: unknown): schema is $ZodDate {
  return isZodType(schema) && schema._zod.def.type === "date"
}

export function isZodObject(schema: unknown): schema is $ZodObject<$ZodShape> {
  return isZodType(schema) && schema._zod.def.type === "object"
}

export function isZodEnum(schema: unknown): schema is $ZodEnum<util.EnumLike> {
  return isZodType(schema) && schema._zod.def.type === "enum"
}

export function isZodUnion(schema: unknown): schema is $ZodUnion<$ZodType[]> {
  return isZodType(schema) && schema._zod.def.type === "union"
}

export function isZodOptional(schema: unknown): schema is $ZodOptional {
  return isZodType(schema) && schema._zod.def.type === "optional"
}

export function isZodNullable(schema: unknown): schema is $ZodNullable {
  return isZodType(schema) && schema._zod.def.type === "nullable"
}

export function isZodNullish(
  schema: unknown
): schema is $ZodOptional | $ZodNullable {
  return isZodOptional(schema) || isZodNullable(schema)
}

export function getDescription(schema: $ZodType): string | undefined {
  if ("description" in schema && typeof schema.description === "string") {
    return schema.description
  }
  return undefined
}

export function isZodDiscriminatedUnion(
  schema: $ZodUnion<$ZodType[]>
): schema is $ZodDiscriminatedUnion<$ZodType[]> {
  return isZodType(schema) && "disc" in schema._zod
}

export function getObjectConfig(
  schema: $ZodObject<$ZodShape>
): Partial<GraphQLObjectTypeConfig<any, any>> {
  const objectConfig = asObjectType.get(schema) as ObjectConfig | undefined
  const interfaces = objectConfig?.interfaces?.map(
    ZodWeaver.ensureInterfaceType
  )

  const name = (() => {
    if ("__typename" in schema._zod.def.shape) {
      let __typename = schema._zod.def.shape["__typename"]
      while (isZodNullish(__typename)) {
        __typename = __typename._zod.def.innerType
      }
      if (isZodLiteral(__typename)) {
        return String(__typename._zod.def.values[0])
      }
    }
    return weaverContext.names.get(schema)
  })()

  return {
    name,
    description: getDescription(schema),
    ...objectConfig,
    interfaces,
    extensions: deepMerge(
      objectConfig?.extensions
    ) as GraphQLObjectTypeExtensions,
  }
}

export function getEnumConfig(schema: $ZodEnum<util.EnumLike>): EnumConfig {
  const enumConfig = asEnumType.get(schema) as EnumConfig | undefined

  return {
    name: weaverContext.names.get(schema),
    description: getDescription(schema),
    ...enumConfig,
    extensions: deepMerge(enumConfig?.extensions),
  }
}

export function getUnionConfig(
  schema: $ZodUnion<$ZodType[]>
): Partial<GraphQLUnionTypeConfig<any, any>> {
  const unionConfig = asUnionType.get(schema) as UnionConfig | undefined
  return {
    name: weaverContext.names.get(schema),
    ...unionConfig,
    description: getDescription(schema),
    extensions: deepMerge(unionConfig?.extensions),
  }
}

export function getFieldConfig(schema: $ZodType): FieldConfig {
  const config = asField.get(schema) as FieldConfig | undefined
  return {
    description: getDescription(schema),
    ...config,
  }
}
