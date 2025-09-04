import { EntitySchema } from "@mikro-orm/libsql"
import { GraphQLFloat, GraphQLString, printType } from "graphql"
import { describe, expect, it } from "vitest"
import { mikroSilk } from "../src"
import {
  type FilterArgs,
  type MikroFactoryPropertyBehaviors,
  MikroInputFactory,
} from "../src/factory"

interface IUser {
  id: number
  name: string
  email: string
  password: string
  age?: number | null
  isActive?: boolean | null
}

const User = mikroSilk(
  new EntitySchema<IUser>({
    name: "User",
    properties: {
      id: { type: "number", primary: true },
      name: { type: "string" },
      email: { type: "string" },
      password: { type: "string" },
      age: { type: "number", nullable: true },
      isActive: { type: "boolean", nullable: true },
    },
  })
)

describe("MikroInputFactory", () => {
  const inputFactory = new MikroInputFactory(User)

  describe("filter", () => {
    it("should generate Filter type for an entity", () => {
      const filterType = inputFactory.filter()
      expect(printType(filterType)).toMatchInlineSnapshot(`
        "type UserFilter {
          id: IDMikroComparisonOperators
          name: StringMikroComparisonOperators
          email: StringMikroComparisonOperators
          password: StringMikroComparisonOperators
          age: FloatMikroComparisonOperators
          isActive: BooleanMikroComparisonOperators
        }"
      `)
    })

    it("should respect field visibility in filters", () => {
      const inputFactoryWithVisibility = new MikroInputFactory(User, {
        getEntityManager: async () => ({}) as any,
        input: {
          password: false, // Hide password from filters
          age: {
            filters: false, // Hide age from filters
          },
          "*": {
            filters: true, // Show everything else
          },
        },
      })

      const filterType = inputFactoryWithVisibility.filter()
      expect(printType(filterType)).toMatchInlineSnapshot(`
        "type UserFilter {
          id: IDMikroComparisonOperators
          name: StringMikroComparisonOperators
          email: StringMikroComparisonOperators
          isActive: BooleanMikroComparisonOperators
        }"
      `)
    })
  })

  describe("orderBy", () => {
    it("should generate OrderBy type for an entity", () => {
      const orderByType = inputFactory.orderBy()
      expect(printType(orderByType)).toMatchInlineSnapshot(`
        "type UserOrderBy {
          id: MikroQueryOrder
          name: MikroQueryOrder
          email: MikroQueryOrder
          password: MikroQueryOrder
          age: MikroQueryOrder
          isActive: MikroQueryOrder
        }"
      `)
    })

    it("should respect field visibility in orderBy", () => {
      const inputFactoryWithVisibility = new MikroInputFactory(User, {
        getEntityManager: async () => ({}) as any,
        input: {
          password: false,
          age: {
            filters: false, // orderBy visibility is tied to filters
          },
        },
      })

      const orderByType = inputFactoryWithVisibility.orderBy()
      expect(printType(orderByType)).toMatchInlineSnapshot(`
        "type UserOrderBy {
          id: MikroQueryOrder
          name: MikroQueryOrder
          email: MikroQueryOrder
          isActive: MikroQueryOrder
        }"
      `)
    })
  })

  describe("findArgs", () => {
    it("should generate FindArgs type for an entity", () => {
      const findArgsType = inputFactory.findArgs()
      expect(printType(findArgsType)).toMatchInlineSnapshot(`
        "type UserFindArgs {
          where: UserFilter
          orderBy: UserOrderBy
          limit: Int
          offset: Int
        }"
      `)
    })

    it("should respect field visibility in findArgs", () => {
      const inputFactoryWithVisibility = new MikroInputFactory(User, {
        getEntityManager: async () => ({}) as any,
        input: {
          password: false,
          age: {
            filters: false,
          },
        },
      })

      const findArgsType = inputFactoryWithVisibility.findArgs()
      expect(printType(findArgsType)).toMatchInlineSnapshot(`
        "type UserFindArgs {
          where: UserFilter
          orderBy: UserOrderBy
          limit: Int
          offset: Int
        }"
      `)

      // Verify that the filter and orderBy types within findArgs also respect visibility
      const filterType = inputFactoryWithVisibility.filter()
      expect(printType(filterType)).toMatchInlineSnapshot(`
        "type UserFilter {
          id: IDMikroComparisonOperators
          name: StringMikroComparisonOperators
          email: StringMikroComparisonOperators
          isActive: BooleanMikroComparisonOperators
        }"
      `)

      const orderByType = inputFactoryWithVisibility.orderBy()
      expect(printType(orderByType)).toMatchInlineSnapshot(`
        "type UserOrderBy {
          id: MikroQueryOrder
          name: MikroQueryOrder
          email: MikroQueryOrder
          isActive: MikroQueryOrder
        }"
      `)
    })
  })

  describe("countArgs", () => {
    it("should generate CountArgs type for an entity", () => {
      const countArgsType = inputFactory.countArgs()
      expect(printType(countArgsType)).toMatchInlineSnapshot(`
        "type UserCountArgs {
          where: UserFilter
        }"
      `)
    })

    it("should respect field visibility in countArgs", () => {
      const inputFactoryWithVisibility = new MikroInputFactory(User, {
        getEntityManager: async () => ({}) as any,
        input: {
          password: false,
          age: {
            filters: false,
          },
        },
      })

      const countArgsType = inputFactoryWithVisibility.countArgs()
      expect(printType(countArgsType)).toMatchInlineSnapshot(`
        "type UserCountArgs {
          where: UserFilter
        }"
      `)

      const filterType = inputFactoryWithVisibility.filter()
      expect(printType(filterType)).toMatchInlineSnapshot(`
        "type UserFilter {
          id: IDMikroComparisonOperators
          name: StringMikroComparisonOperators
          email: StringMikroComparisonOperators
          isActive: BooleanMikroComparisonOperators
        }"
      `)
    })
  })

  describe("comparisonOperatorsType", () => {
    it("should create operators type for String", () => {
      const stringType =
        MikroInputFactory.comparisonOperatorsType(GraphQLString)
      expect(printType(stringType)).toMatchInlineSnapshot(`
        "type StringMikroComparisonOperators {
          """Equals. Matches values that are equal to a specified value."""
          eq: String

          """Greater. Matches values that are greater than a specified value."""
          gt: String

          """
          Greater or Equal. Matches values that are greater than or equal to a specified value.
          """
          gte: String

          """Contains, Contains, Matches any of the values specified in an array."""
          in: [String!]

          """Lower, Matches values that are less than a specified value."""
          lt: String

          """
          Lower or equal, Matches values that are less than or equal to a specified value.
          """
          lte: String

          """Not equal. Matches all values that are not equal to a specified value."""
          ne: String

          """Not contains. Matches none of the values specified in an array."""
          nin: [String!]

          """&&"""
          overlap: [String!]

          """@>"""
          contains: [String!]

          """<@"""
          contained: [String!]

          """Like. Uses LIKE operator"""
          like: String

          """Regexp. Uses REGEXP operator"""
          re: String

          """Full text.	A driver specific full text search function."""
          fulltext: String

          """ilike"""
          ilike: String
        }"
      `)
    })

    it("should create operators type for Float", () => {
      const floatType = MikroInputFactory.comparisonOperatorsType(GraphQLFloat)
      expect(printType(floatType)).toMatchInlineSnapshot(`
        "type FloatMikroComparisonOperators {
          """Equals. Matches values that are equal to a specified value."""
          eq: Float

          """Greater. Matches values that are greater than a specified value."""
          gt: Float

          """
          Greater or Equal. Matches values that are greater than or equal to a specified value.
          """
          gte: Float

          """Contains, Contains, Matches any of the values specified in an array."""
          in: [Float!]

          """Lower, Matches values that are less than a specified value."""
          lt: Float

          """
          Lower or equal, Matches values that are less than or equal to a specified value.
          """
          lte: Float

          """Not equal. Matches all values that are not equal to a specified value."""
          ne: Float

          """Not contains. Matches none of the values specified in an array."""
          nin: [Float!]

          """&&"""
          overlap: [Float!]

          """@>"""
          contains: [Float!]

          """<@"""
          contained: [Float!]
        }"
      `)
    })
  })

  describe("isPropertyVisible", () => {
    it("should return true by default", () => {
      expect(
        MikroInputFactory.isPropertyVisible("name", undefined, "filters")
      ).toBe(true)
    })

    it("should respect boolean visibility", () => {
      const behaviors: MikroFactoryPropertyBehaviors<IUser> = {
        name: false,
        email: true,
      }

      expect(
        MikroInputFactory.isPropertyVisible("name", behaviors, "filters")
      ).toBe(false)
      expect(
        MikroInputFactory.isPropertyVisible("email", behaviors, "filters")
      ).toBe(true)
    })

    it("should respect operation-specific visibility", () => {
      const behaviors: MikroFactoryPropertyBehaviors<IUser> = {
        password: {
          filters: false,
          create: true,
          update: true,
        },
      }

      expect(
        MikroInputFactory.isPropertyVisible("password", behaviors, "filters")
      ).toBe(false)
      expect(
        MikroInputFactory.isPropertyVisible("password", behaviors, "create")
      ).toBe(true)
      expect(
        MikroInputFactory.isPropertyVisible("password", behaviors, "update")
      ).toBe(true)
    })

    it("should respect default behavior", () => {
      const behaviors: MikroFactoryPropertyBehaviors<IUser> = {
        "*": false,
        email: true,
      }

      expect(
        MikroInputFactory.isPropertyVisible("name", behaviors, "filters")
      ).toBe(false)
      expect(
        MikroInputFactory.isPropertyVisible("email", behaviors, "filters")
      ).toBe(true)
    })
  })

  describe("transformFilters", () => {
    class TestTransformer<
      TEntity extends object,
    > extends MikroInputFactory<TEntity> {
      public transformFilters(args: FilterArgs<TEntity> | undefined) {
        return super.transformFilters(args)
      }
    }
    const transformer = new TestTransformer(User)
    it("should return undefined for undefined input", () => {
      expect(transformer.transformFilters(undefined)).toBeUndefined()
    })

    it("should handle an empty filter object", () => {
      expect(transformer.transformFilters({})).toEqual({})
    })

    it("should transform simple equality filter", () => {
      const args: FilterArgs<IUser> = { name: { eq: "John" } }
      const expected = { name: { $eq: "John" } }
      expect(transformer.transformFilters(args)).toEqual(expected)
    })

    it("should transform multiple simple filters", () => {
      const args: FilterArgs<IUser> = { name: { eq: "John" }, age: { gt: 30 } }
      const expected = { name: { $eq: "John" }, age: { $gt: 30 } }
      expect(transformer.transformFilters(args)).toEqual(expected)
    })

    it("should transform an 'and' condition", () => {
      const args: FilterArgs<IUser> = {
        and: [{ name: { like: "%Doe" } }, { age: { lte: 40 } }],
      }
      const expected = {
        $and: [{ name: { $like: "%Doe" } }, { age: { $lte: 40 } }],
      }
      expect(transformer.transformFilters(args)).toEqual(expected)
    })

    it("should transform an 'or' condition", () => {
      const args: FilterArgs<IUser> = {
        or: [{ isActive: { eq: true } }, { age: { in: [25, 35, 45] } }],
      }
      const expected = {
        $or: [{ isActive: { $eq: true } }, { age: { $in: [25, 35, 45] } }],
      }
      expect(transformer.transformFilters(args)).toEqual(expected)
    })

    it("should combine 'and'/'or' with root-level conditions", () => {
      const args: FilterArgs<IUser> = {
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
      const args: FilterArgs<IUser> = {
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
      const args: FilterArgs<IUser> = {
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
      const args: FilterArgs<IUser> = { and: [], or: [] }
      const expected = { $and: [], $or: [] }
      expect(transformer.transformFilters(args)).toEqual(expected)
    })
  })
})
