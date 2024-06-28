import { describe, expect, it } from "vitest"
import { silk } from "./silk"
import { GraphQLNonNull, GraphQLString } from "graphql"

describe("silk", () => {
  describe("nonNull", () => {
    it("should return a non nullable silk", () => {
      const stringSilk = silk(GraphQLString)

      const nonNullStringSilk = silk.nonNull(stringSilk)

      expect(silk.getGraphQLType(nonNullStringSilk)).toBeInstanceOf(
        GraphQLNonNull
      )
    })
  })
})
