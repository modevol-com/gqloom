import { type GraphQLObjectTypeConfig } from "graphql"

export function parseObjectConfig(
  description: string
): Omit<GraphQLObjectTypeConfig<any, any>, "fields"> {
  return {
    name: description,
    extensions: {},
  }
}
