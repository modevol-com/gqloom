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

    it("should reject null/undefined in validate", async () => {
      const stringSilk = silk(GraphQLString)
      const nonNullStringSilk = silk.nonNull(stringSilk)

      const nullResult = await silk.parse(nonNullStringSilk, null)
      const undefinedResult = await silk.parse(nonNullStringSilk, undefined)

      expect(nullResult).toHaveProperty("issues")
      expect(nullResult.issues).toHaveLength(1)
      expect(nullResult.issues![0].message).toBe(
        "Value must not be null or undefined"
      )
      expect(undefinedResult).toHaveProperty("issues")
    })

    it("should accept valid value and delegate to origin validate", async () => {
      const stringSilk = silk(GraphQLString)
      const nonNullStringSilk = silk.nonNull(stringSilk)

      const result = await silk.parse(nonNullStringSilk, "hello")

      expect(result).toHaveProperty("value", "hello")
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

    it("should reject non-array in validate", async () => {
      const stringSilk = silk(GraphQLString)
      const listStringSilk = silk.list(stringSilk)

      const result = await silk.parse(listStringSilk, "not an array")

      expect(result).toHaveProperty("issues")
      expect(result.issues![0].message).toBe("Value must be an array")
    })

    it("should accept empty array and return empty array", async () => {
      const stringSilk = silk(GraphQLString)
      const listStringSilk = silk.list(stringSilk)

      const result = await silk.parse(listStringSilk, [])

      expect(result).toHaveProperty("value")
      if (result.issues) throw new Error("Expected no issues")
      expect(result.value).toEqual([])
    })

    it("should validate each element and return array", async () => {
      const stringSilk = silk(GraphQLString)
      const listStringSilk = silk.list(stringSilk)

      const result = await silk.parse(listStringSilk, ["a", "b"])

      expect(result).toHaveProperty("value", ["a", "b"])
    })

    it("should collect issues with path when element validation fails", async () => {
      const stringSilk = silk(GraphQLString, (v) => {
        if (typeof v !== "string" || v.length < 2) {
          return { issues: [{ message: "min 2 chars" }] }
        }
        return { value: v }
      })
      const listStringSilk = silk.list(stringSilk)

      const result = await silk.parse(listStringSilk, ["ab", "x", "cd"])

      expect(result).toHaveProperty("issues")
      const issues = result.issues!
      expect(issues).toHaveLength(1)
      expect(issues[0].message).toBe("min 2 chars")
      expect(issues[0].path).toEqual([1])
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

    it("should accept null/undefined and return as value", async () => {
      const stringSilk = silk(new GraphQLNonNull(GraphQLString))
      const nullableStringSilk = silk.nullable(stringSilk)

      const nullResult = await silk.parse(nullableStringSilk, null)
      const undefinedResult = await silk.parse(nullableStringSilk, undefined)

      expect(nullResult).toHaveProperty("value")
      if (nullResult.issues) throw new Error("Expected no issues")
      expect(nullResult.value).toBeNull()
      expect(undefinedResult).toHaveProperty("value")
      if (undefinedResult.issues) throw new Error("Expected no issues")
      expect(undefinedResult.value).toBeUndefined()
    })

    it("should delegate to origin validate for non-null value", async () => {
      const stringSilk = silk(new GraphQLNonNull(GraphQLString))
      const nullableStringSilk = silk.nullable(stringSilk)

      const result = await silk.parse(nullableStringSilk, "hello")

      expect(result).toHaveProperty("value", "hello")
    })
  })
})
