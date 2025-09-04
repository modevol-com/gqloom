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
    it("should generate Filter type for an entity", async () => {
      const filterType = inputFactory.filter()
      await expect(printType(filterType)).toMatchFileSnapshot(
        "./snapshots/UserFilter.graphql"
      )
    })

    it("should respect field visibility in filters", async () => {
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
      await expect(printType(filterType)).toMatchFileSnapshot(
        "./snapshots/UserFilterWithVisibility.graphql"
      )
    })
  })

  describe("orderBy", () => {
    it("should generate OrderBy type for an entity", async () => {
      const orderByType = inputFactory.orderBy()
      await expect(printType(orderByType)).toMatchFileSnapshot(
        "./snapshots/UserOrderBy.graphql"
      )
    })

    it("should respect field visibility in orderBy", async () => {
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
      await expect(printType(orderByType)).toMatchFileSnapshot(
        "./snapshots/UserOrderByWithVisibility.graphql"
      )
    })
  })

  describe("findArgs", () => {
    it("should generate FindArgs type for an entity", async () => {
      const findArgsType = inputFactory.findArgs()
      await expect(printType(findArgsType)).toMatchFileSnapshot(
        "./snapshots/UserFindArgs.graphql"
      )
    })

    it("should respect field visibility in findArgs", async () => {
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
      await expect(printType(findArgsType)).toMatchFileSnapshot(
        "./snapshots/UserFindArgsWithVisibility.graphql"
      )

      // Verify that the filter and orderBy types within findArgs also respect visibility
      const filterType = inputFactoryWithVisibility.filter()
      await expect(printType(filterType)).toMatchFileSnapshot(
        "./snapshots/UserFilterNestedInFindArgsWithVisibility.graphql"
      )

      const orderByType = inputFactoryWithVisibility.orderBy()
      await expect(printType(orderByType)).toMatchFileSnapshot(
        "./snapshots/UserOrderByNestedInFindArgsWithVisibility.graphql"
      )
    })
  })

  describe("countArgs", () => {
    it("should generate CountArgs type for an entity", async () => {
      const countArgsType = inputFactory.countArgs()
      await expect(printType(countArgsType)).toMatchFileSnapshot(
        "./snapshots/UserCountArgs.graphql"
      )
    })

    it("should respect field visibility in countArgs", async () => {
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
      await expect(printType(countArgsType)).toMatchFileSnapshot(
        "./snapshots/UserCountArgsWithVisibility.graphql"
      )

      const filterType = inputFactoryWithVisibility.filter()
      await expect(printType(filterType)).toMatchFileSnapshot(
        "./snapshots/UserFilterNestedInCountArgsWithVisibility.graphql"
      )
    })
  })

  describe("findByCursorArgs", () => {
    it("should generate FindByCursorArgs type for an entity", async () => {
      const findByCursorArgsType = inputFactory.findByCursorArgs()
      await expect(printType(findByCursorArgsType)).toMatchFileSnapshot(
        "./snapshots/UserFindByCursorArgs.graphql"
      )
    })

    it("should respect field visibility in findByCursorArgs", async () => {
      const inputFactoryWithVisibility = new MikroInputFactory(User, {
        getEntityManager: async () => ({}) as any,
        input: {
          password: false,
          age: {
            filters: false,
          },
        },
      })

      const findByCursorArgsType = inputFactoryWithVisibility.findByCursorArgs()
      await expect(printType(findByCursorArgsType)).toMatchFileSnapshot(
        "./snapshots/UserFindByCursorArgsWithVisibility.graphql"
      )

      // Verify that the filter and orderBy types within findByCursorArgs also respect visibility
      const filterType = inputFactoryWithVisibility.filter()
      await expect(printType(filterType)).toMatchFileSnapshot(
        "./snapshots/UserFilterNestedInFindByCursorArgsWithVisibility.graphql"
      )

      const orderByType = inputFactoryWithVisibility.orderBy()
      await expect(printType(orderByType)).toMatchFileSnapshot(
        "./snapshots/UserOrderByNestedInFindByCursorArgsWithVisibility.graphql"
      )
    })
  })

  describe("findOneArgs", () => {
    it("should generate FindOneArgs type for an entity", async () => {
      const findOneArgsType = inputFactory.findOneArgs()
      await expect(printType(findOneArgsType)).toMatchFileSnapshot(
        "./snapshots/UserFindOneArgs.graphql"
      )
    })

    it("should respect field visibility in findOneArgs", async () => {
      const inputFactoryWithVisibility = new MikroInputFactory(User, {
        getEntityManager: async () => ({}) as any,
        input: {
          password: false,
          age: {
            filters: false,
          },
        },
      })

      const findOneArgsType = inputFactoryWithVisibility.findOneArgs()
      await expect(printType(findOneArgsType)).toMatchFileSnapshot(
        "./snapshots/UserFindOneArgsWithVisibility.graphql"
      )

      // Verify that the filter and orderBy types within findOneArgs also respect visibility
      const filterType = inputFactoryWithVisibility.filter()
      await expect(printType(filterType)).toMatchFileSnapshot(
        "./snapshots/UserFilterNestedInFindOneArgsWithVisibility.graphql"
      )

      const orderByType = inputFactoryWithVisibility.orderBy()
      await expect(printType(orderByType)).toMatchFileSnapshot(
        "./snapshots/UserOrderByNestedInFindOneArgsWithVisibility.graphql"
      )
    })
  })

  describe("comparisonOperatorsType", () => {
    it("should create operators type for String", async () => {
      const stringType =
        MikroInputFactory.comparisonOperatorsType(GraphQLString)
      await expect(printType(stringType)).toMatchFileSnapshot(
        "./snapshots/StringMikroComparisonOperators.graphql"
      )
    })

    it("should create operators type for Float", async () => {
      const floatType = MikroInputFactory.comparisonOperatorsType(GraphQLFloat)
      await expect(printType(floatType)).toMatchFileSnapshot(
        "./snapshots/FloatMikroComparisonOperators.graphql"
      )
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
