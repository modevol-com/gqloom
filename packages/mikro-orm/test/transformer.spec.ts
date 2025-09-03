import { describe, expect, it } from "vitest"
import { MikroArgsTransformer } from "../src/factory/transformer"
import type { FilterArgs } from "../src/factory/type"

interface User {
  id: number
  name: string
  age: number
  isActive: boolean
}

describe("MikroArgsTransformer", () => {
  const transformer = new MikroArgsTransformer<User>("User")

  describe("transformFilters", () => {
    it("should return undefined for undefined input", () => {
      expect(transformer.transformFilters(undefined)).toBeUndefined()
    })

    it("should handle an empty filter object", () => {
      expect(transformer.transformFilters({})).toEqual({})
    })

    it("should transform simple equality filter", () => {
      const args: FilterArgs<User> = { name: { eq: "John" } }
      const expected = { name: { $eq: "John" } }
      expect(transformer.transformFilters(args)).toEqual(expected)
    })

    it("should transform multiple simple filters", () => {
      const args: FilterArgs<User> = { name: { eq: "John" }, age: { gt: 30 } }
      const expected = { name: { $eq: "John" }, age: { $gt: 30 } }
      expect(transformer.transformFilters(args)).toEqual(expected)
    })

    it("should transform an 'and' condition", () => {
      const args: FilterArgs<User> = {
        and: [{ name: { like: "%Doe" } }, { age: { lte: 40 } }],
      }
      const expected = {
        $and: [{ name: { $like: "%Doe" } }, { age: { $lte: 40 } }],
      }
      expect(transformer.transformFilters(args)).toEqual(expected)
    })

    it("should transform an 'or' condition", () => {
      const args: FilterArgs<User> = {
        or: [{ isActive: { eq: true } }, { age: { in: [25, 35, 45] } }],
      }
      const expected = {
        $or: [{ isActive: { $eq: true } }, { age: { $in: [25, 35, 45] } }],
      }
      expect(transformer.transformFilters(args)).toEqual(expected)
    })

    it("should combine 'and'/'or' with root-level conditions", () => {
      const args: FilterArgs<User> = {
        name: { eq: "Admin" },
        or: [{ age: { gt: 60 } }, { isActive: { eq: false } }],
      }
      const expected = {
        name: { $eq: "Admin" },
        $or: [{ age: { $gt: 60 } }, { isActive: { $eq: false } }],
      }
      expect(transformer.transformFilters(args)).toEqual(expected)
    })

    it("should handle nested 'and' and 'or' conditions", () => {
      const args: FilterArgs<User> = {
        or: [
          { name: { eq: "Jane" } },
          {
            and: [{ age: { gte: 20 } }, { age: { lt: 30 } }],
          },
        ],
      }
      const expected = {
        $or: [
          { name: { $eq: "Jane" } },
          {
            $and: [{ age: { $gte: 20 } }, { age: { $lt: 30 } }],
          },
        ],
      }
      expect(transformer.transformFilters(args)).toEqual(expected)
    })

    it("should handle deeply nested logical operators", () => {
      const args: FilterArgs<User> = {
        and: [
          { isActive: { eq: true } },
          {
            or: [
              { age: { nin: [18, 19, 20] } },
              {
                and: [{ name: { ne: "Guest" } }, { id: { gt: 100 } }],
              },
            ],
          },
        ],
      }
      const expected = {
        $and: [
          { isActive: { $eq: true } },
          {
            $or: [
              { age: { $nin: [18, 19, 20] } },
              {
                $and: [{ name: { $ne: "Guest" } }, { id: { $gt: 100 } }],
              },
            ],
          },
        ],
      }
      expect(transformer.transformFilters(args)).toEqual(expected)
    })

    it("should return an empty object for empty logical operator arrays", () => {
      const args: FilterArgs<User> = { and: [], or: [] }
      const expected = { $and: [], $or: [] }
      expect(transformer.transformFilters(args)).toEqual(expected)
    })
  })
})
