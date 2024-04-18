import { directives as defineDirectives } from "@gqloom/core"
import {
  type GraphQLTypeResolver,
  type GraphQLFieldConfig,
  type GraphQLObjectTypeConfig,
} from "graphql"
import {
  type ZodStringCheck,
  type ZodDiscriminatedUnion,
  type ZodObject,
} from "zod"

const directiveRegex = /@\w+(\(.*?\))?/g

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
export const ZodIDKinds: Set<ZodStringCheck["kind"]> = new Set([
  "cuid",
  "cuid2",
  "ulid",
  "uuid",
])
