import { EntitySchema } from "@mikro-orm/libsql"
import { GraphQLFloat, GraphQLString, printType } from "graphql"
import { describe, expect, it } from "vitest"
import { mikroSilk } from "../src"
import {
  type MikroFactoryPropertyBehaviors,
  MikroInputFactory,
} from "../src/factory"

interface IUser {
  id: number
  name: string
  email: string
  password: string
  age?: number | null
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
})
