import { query, resolver, silk } from "@gqloom/core"
import { GraphQLNonNull, GraphQLString } from "graphql"

export const helloResolver = resolver({
  hello: query(
    silk<string>(new GraphQLNonNull(GraphQLString)),
    () => "Hello, World"
  ),
})
