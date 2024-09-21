import { loom, silk } from "@gqloom/core"
import { GraphQLNonNull, GraphQLString } from "graphql"

const { resolver, query } = loom

export const HelloResolver = resolver({
  hello: query(
    silk<string>(new GraphQLNonNull(GraphQLString)),
    () => "Hello, World"
  ),
})
