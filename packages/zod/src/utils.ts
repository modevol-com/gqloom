import { directives as defineDirectives } from "@gqloom/core"
import {
  type GraphQLTypeResolver,
  type GraphQLFieldConfig,
  type GraphQLObjectTypeConfig,
  type GraphQLEnumTypeConfig,
  type GraphQLUnionTypeConfig,
} from "graphql"
import {
  type ZodEnum,
  type ZodNativeEnum,
  type ZodDiscriminatedUnion,
  type ZodObject,
  type ZodUnion,
  type ZodSchema,
} from "zod"
import { metadataCollector } from "./metadata-collector"

const directiveRegex = /@\w+(\(.*?\))?/g

export function getObjectConfig(
  schema: ZodObject<any>
): Partial<GraphQLObjectTypeConfig<any, any>> {
  const fromMetadata = metadataCollector.objects.get(schema)
  const fromDescription = schema.description
    ? parseObjectConfig(schema.description)
    : undefined
  return { ...fromMetadata, ...fromDescription }
}

export function getEnumConfig(
  schema: ZodEnum<any> | ZodNativeEnum<any>
): Partial<GraphQLEnumTypeConfig> {
  const fromMetadata = metadataCollector.enums.get(schema)
  const fromDescription = schema.description
    ? parseObjectConfig(schema.description)
    : undefined
  return { ...fromMetadata, ...fromDescription }
}

export function getUnionConfig(
  schema: ZodDiscriminatedUnion<any, any> | ZodUnion<any>
): Partial<GraphQLUnionTypeConfig<any, any>> {
  const fromMetadata = metadataCollector.unions.get(schema)
  const fromDescription = schema.description
    ? parseObjectConfig(schema.description)
    : undefined
  return { ...fromMetadata, ...fromDescription }
}

export function getFieldConfig(
  schema: ZodSchema
): Partial<GraphQLFieldConfig<any, any>> {
  const fromMetadata = metadataCollector.fields.get(schema)
  const fromDescription = schema.description
    ? parseObjectConfig(schema.description)
    : undefined
  return { ...fromMetadata, ...fromDescription }
}

export function parseObjectConfig(
  input: string
): Pick<
  GraphQLObjectTypeConfig<any, any>,
  "name" | "description" | "extensions"
> {
  const directiveMatches = Array.from(input.matchAll(directiveRegex))
  const extractedDirectives = directiveMatches.map((match) => match[0])

  const inputWithoutDirectives = input.replace(directiveRegex, "")

  const [name, ...maybeDescription] = inputWithoutDirectives.split(":")

  return {
    name: name.trim(),
    description:
      maybeDescription.length > 0
        ? maybeDescription.join(":").trim()
        : undefined,
    extensions: defineDirectives(...extractedDirectives),
  }
}

export function parseFieldConfig(
  input: string | undefined
):
  | Pick<GraphQLFieldConfig<any, any>, "description" | "extensions">
  | undefined {
  if (!input) return undefined
  const directiveMatches = Array.from(input.matchAll(directiveRegex))
  const extractedDirectives = directiveMatches.map((match) => match[0])

  const inputWithoutDirectives = input.replace(directiveRegex, "")

  return {
    description: inputWithoutDirectives.trim(),
    extensions: defineDirectives(...extractedDirectives),
  }
}

export function resolveTypeByDiscriminatedUnion(
  schema: ZodDiscriminatedUnion<string, ZodObject<any>[]>
): GraphQLTypeResolver<any, any> {
  return (data) => {
    const discriminatorValue: string = data[schema.discriminator]
    const option = schema.optionsMap.get(discriminatorValue)
    if (!option?.description) return undefined
    const { name } = parseObjectConfig(option.description)
    return name
  }
}
