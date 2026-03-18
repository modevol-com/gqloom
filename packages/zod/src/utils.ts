import { deepMerge, weaverContext } from "@gqloom/core"
import type {
  GraphQLObjectTypeConfig,
  GraphQLObjectTypeExtensions,
  GraphQLTypeResolver,
  GraphQLUnionTypeConfig,
} from "graphql"
import type {
  $ZodArray,
  $ZodBoolean,
  $ZodDate,
  $ZodDefault,
  $ZodDiscriminatedUnion,
  $ZodEnum,
  $ZodLazy,
  $ZodLiteral,
  $ZodNullable,
  $ZodNumber,
  $ZodObject,
  $ZodOptional,
  $ZodPipe,
  $ZodShape,
  $ZodString,
  $ZodType,
  $ZodUnion,
  GlobalMeta,
  util,
} from "zod/v4/core"
import { globalRegistry } from "zod/v4/core"
import { ZodWeaver } from "."
import { asEnumType, asField, asObjectType, asUnionType } from "./metadata"
import type {
  EnumConfig,
  FieldConfig,
  ObjectConfig,
  UnionConfig,
  ZodWeaverConfig,
  ZodWeaverConfigOptions,
} from "./types"

const defaultMetaToConfig = (meta: GlobalMeta) => {
  const config: { name?: string; description?: string } = {}
  if (meta.title) config.name = meta.title
  if (meta.description) config.description = meta.description
  return config
}

const defaultMetaToFieldConfig = (meta: GlobalMeta) => {
  const config: { description?: string } = {}
  if (meta.description) config.description = meta.description
  return config
}

function getGlobalMeta(schema: $ZodType): GlobalMeta | undefined {
  const fromRegistry = globalRegistry.get(schema)
  const fromMeta =
    "meta" in schema && typeof schema.meta === "function"
      ? (schema.meta() as GlobalMeta | undefined)
      : undefined

  if (!fromRegistry && !fromMeta) return undefined
  return { ...fromMeta, ...fromRegistry }
}

export function resolveTypeByDiscriminatedUnion(
  schema: $ZodDiscriminatedUnion
): GraphQLTypeResolver<any, any> {
  const discriminator = schema._zod.def.discriminator

  const optionsMap = new Map<any, $ZodObject<$ZodShape>>()
  for (const option of schema._zod.def.options) {
    if (!isZodObject(option)) continue

    const propValues = option._zod.propValues
    if (propValues && discriminator in propValues) {
      const values = propValues[discriminator]!
      for (const value of values) {
        optionsMap.set(value, option)
      }
    }
  }

  return (data) => {
    if (!data || typeof data !== "object") {
      return undefined
    }
    const discriminatorValue = data[discriminator]
    const matchedOption = optionsMap.get(discriminatorValue)

    if (matchedOption) {
      return getObjectConfig(matchedOption).name
    }

    return undefined
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

export function isZodPipe(schema: unknown): schema is $ZodPipe {
  return isZodType(schema) && schema._zod.def.type === "pipe"
}

export function isZodLazy(schema: unknown): schema is $ZodLazy {
  return isZodType(schema) && schema._zod.def.type === "lazy"
}

export function getDescription(schema: $ZodType): string | undefined {
  while (true) {
    if ("description" in schema && typeof schema.description === "string") {
      return schema.description
    }
    if (isZodPipe(schema)) {
      schema = schema._zod.def.in
    } else if (isZodOptional(schema)) {
      schema = schema._zod.def.innerType
    } else if (isZodNullable(schema)) {
      schema = schema._zod.def.innerType
    } else if (isZodArray(schema)) {
      schema = schema._zod.def.element
    } else if (isZodLazy(schema)) {
      schema = schema._zod.def.getter()
    } else {
      break
    }
  }
}

export function isZodDiscriminatedUnion(
  schema: $ZodUnion<$ZodType[]>
): schema is $ZodDiscriminatedUnion<$ZodType[]> {
  return isZodUnion(schema) && "discriminator" in schema._zod.def
}

export function getObjectConfig(
  schema: $ZodObject<$ZodShape>
): Partial<GraphQLObjectTypeConfig<any, any>> {
  const objectConfig = asObjectType.get(schema) as ObjectConfig | undefined
  const meta = getGlobalMeta(schema)
  const weaverConfig = weaverContext.getConfig<ZodWeaverConfig>("gqloom.zod")
  const metaToObjectConfig =
    weaverConfig?.metaToObjectConfig ??
    (defaultMetaToConfig as NonNullable<
      ZodWeaverConfigOptions["metaToObjectConfig"]
    >)
  const metaConfig = meta ? metaToObjectConfig(meta) : undefined
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
    ...metaConfig,
    ...objectConfig,
    interfaces,
    extensions: deepMerge(
      metaConfig?.extensions,
      objectConfig?.extensions
    ) as GraphQLObjectTypeExtensions,
  }
}

export function getEnumConfig(schema: $ZodEnum<util.EnumLike>): EnumConfig {
  const enumConfig = asEnumType.get(schema) as EnumConfig | undefined
  const meta = getGlobalMeta(schema)
  const weaverConfig = weaverContext.getConfig<ZodWeaverConfig>("gqloom.zod")
  const metaConfig =
    meta &&
    (
      weaverConfig?.metaToEnumConfig ??
      (defaultMetaToConfig as NonNullable<
        ZodWeaverConfigOptions["metaToEnumConfig"]
      >)
    )(meta)

  return {
    name: weaverContext.names.get(schema),
    description: getDescription(schema),
    ...metaConfig,
    ...enumConfig,
    extensions: deepMerge(metaConfig?.extensions, enumConfig?.extensions),
  }
}

export function getUnionConfig(
  schema: $ZodUnion<$ZodType[]>
): Partial<GraphQLUnionTypeConfig<any, any>> {
  const unionConfig = asUnionType.get(schema) as UnionConfig | undefined
  const meta = getGlobalMeta(schema)
  const weaverConfig = weaverContext.getConfig<ZodWeaverConfig>("gqloom.zod")
  const metaConfig =
    meta &&
    (
      weaverConfig?.metaToUnionConfig ??
      (defaultMetaToConfig as NonNullable<
        ZodWeaverConfigOptions["metaToUnionConfig"]
      >)
    )(meta)
  return {
    name: weaverContext.names.get(schema),
    description: getDescription(schema),
    ...metaConfig,
    ...unionConfig,
    extensions: deepMerge(metaConfig?.extensions, unionConfig?.extensions),
  }
}

export function getFieldConfig(schema: $ZodType): FieldConfig {
  const config = asField.get(schema) as FieldConfig | undefined
  const meta = getGlobalMeta(schema)
  const weaverConfig = weaverContext.getConfig<ZodWeaverConfig>("gqloom.zod")
  const metaConfig =
    meta &&
    (
      weaverConfig?.metaToFieldConfig ??
      (defaultMetaToFieldConfig as NonNullable<
        ZodWeaverConfigOptions["metaToFieldConfig"]
      >)
    )(meta)
  return {
    description: getDescription(schema),
    ...metaConfig,
    ...config,
  }
}
