import { directives as defineDirectives } from "@gqloom/core"
import { type GraphQLFieldConfig, type GraphQLObjectTypeConfig } from "graphql"

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
  input: string
): Pick<GraphQLFieldConfig<any, any>, "description" | "extensions"> {
  const directiveMatches = Array.from(input.matchAll(directiveRegex))
  const extractedDirectives = directiveMatches.map((match) => match[0])

  const inputWithoutDirectives = input.replace(directiveRegex, "")

  return {
    description: inputWithoutDirectives.trim(),
    extensions: defineDirectives(...extractedDirectives),
  }
}
