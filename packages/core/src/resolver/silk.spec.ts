import {
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  printSchema,
} from "graphql"
import { describe, expect, it } from "vitest"
import { weave } from "../schema"
import { loom } from "./resolver"
import { silk } from "./silk"

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

  describe("list", () => {
    it("should return a list silk", () => {
      const stringSilk = silk(GraphQLString)
      const gType = silk.getType(silk.list(stringSilk))
      expect(gType).toBeInstanceOf(GraphQLNonNull)
      expect((gType as GraphQLNonNull<any>).ofType).toBeInstanceOf(GraphQLList)
    })

    it("should keep list GraphQL Type", () => {
      const stringSilk = silk<string[], string[]>(
        new GraphQLList(GraphQLString)
      )
      const gType = silk.getType(silk.list(stringSilk))
      expect(gType).toBeInstanceOf(GraphQLNonNull)
      expect((gType as GraphQLNonNull<any>).ofType).toBeInstanceOf(GraphQLList)
      const stringSilk2 = silk<string[], string[]>(
        new GraphQLNonNull(new GraphQLList(GraphQLString))
      )
      const gType2 = silk.getType(silk.list(stringSilk2))
      expect(gType2).toBeInstanceOf(GraphQLNonNull)
      expect((gType2 as GraphQLNonNull<any>).ofType).toBeInstanceOf(GraphQLList)
    })

    it("should keep nullable ofType", () => {
      const stringSilk = silk(GraphQLString)
      const r = loom.resolver({
        texts: loom.query(silk.list(stringSilk), () => []),
      })

      const schema = weave(r)
      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type Query {
          texts: [String]!
        }"
      `)
    })

    it("should keep nonNull ofType", () => {
      const stringSilk = silk(GraphQLString)
      const r = loom.resolver({
        texts: loom.query(silk.list(silk.nonNull(stringSilk)), () => []),
      })

      const schema = weave(r)
      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type Query {
          texts: [String!]!
        }"
      `)
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
