import { directives as defineDirectives } from "@gqloom/core"
import { type GraphQLObjectTypeConfig } from "graphql"

const directiveRegex = /@\w+(\(.*?\))?/g

export function parseObjectConfig(
  input: string
): Omit<GraphQLObjectTypeConfig<any, any>, "fields"> {
  const directiveMatches = Array.from(input.matchAll(directiveRegex))
  const extractedDirectives = directiveMatches.map((match) => match[0])

  const inputWithoutDirectives = input.replace(directiveRegex, "")

  const [name, ...maybeDescription] = inputWithoutDirectives.split(":")

  return {
    name: name.trim(),
    description: maybeDescription.join(":").trim(),
    extensions: defineDirectives(...extractedDirectives),
  }
}
