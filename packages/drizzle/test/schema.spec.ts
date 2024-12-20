import { getGraphQLType } from "@gqloom/core"
import {
  GraphQLNonNull,
  type GraphQLObjectType,
  type GraphQLOutputType,
  printType,
} from "graphql"
import { describe, expect, it } from "vitest"
import { usersTable } from "./db/schema"

describe("drizzleSilk", () => {
  it("should handle object", () => {
    const gqlType = getGraphQLType(usersTable)
    expect(printType(unwrap(gqlType))).toMatchInlineSnapshot(`
      "type UsersTable {
        id: Int
        name: String
        age: Int
        email: String
      }"
    `)
  })
})

function unwrap(gqlType: GraphQLOutputType) {
  if (gqlType instanceof GraphQLNonNull) {
    return gqlType.ofType as GraphQLObjectType
  }
  return gqlType as GraphQLObjectType
}
