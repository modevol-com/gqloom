import { describe, expect, it } from "vitest"
import { silk } from "./silk"
import { GraphQLNonNull, GraphQLString } from "graphql"

describe("silk", () => {
  describe("nonNull", () => {
    it("should return a non nullable silk", () => {
      const stringSilk = silk(GraphQLString)

      const nonNullStringSilk = silk.nonNull(stringSilk)

      expect(silk.getType(nonNullStringSilk)).toBeInstanceOf(GraphQLNonNull)
    })

    it("should keep non nullable GraphQL Type", () => {
      const stringSilk = silk(new GraphQLNonNull(GraphQLString))

      const nonNullStringSilk = silk.nonNull(stringSilk)

      expect(silk.getType(nonNullStringSilk)).toBeInstanceOf(GraphQLNonNull)
    })
  })

  describe("nullable", () => {
    it("should return a nullable silk", () => {
      const stringSilk = silk(new GraphQLNonNull(GraphQLString))
      expect(silk.getType(silk.nullable(stringSilk))).toBe(GraphQLString)
    })
    it("should return keep nullable silk", () => {
      const stringSilk = silk(GraphQLString)
      expect(silk.getType(silk.nullable(stringSilk))).toBe(GraphQLString)
    })
  })
})
