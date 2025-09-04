import { silk } from "@gqloom/core"
import { EntitySchema, type FilterQuery } from "@mikro-orm/libsql"
import { GraphQLFloat, GraphQLNonNull, GraphQLString, printType } from "graphql"
import { GraphQLScalarType } from "graphql"
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

  describe("createInput", () => {
    it("should generate CreateInput type for an entity", async () => {
      const createInputType = inputFactory.createInput()
      await expect(printType(createInputType)).toMatchFileSnapshot(
        "./snapshots/UserCreateInput.graphql"
      )
    })

    it("should respect field visibility in createInput", async () => {
      const inputFactoryWithVisibility = new MikroInputFactory(User, {
        getEntityManager: async () => ({}) as any,
        input: {
          password: false, // Hide password from create
          age: {
            create: false, // Hide age from create
          },
          "*": {
            create: true, // Show everything else
          },
        },
      })

      const createInputType = inputFactoryWithVisibility.createInput()
      await expect(printType(createInputType)).toMatchFileSnapshot(
        "./snapshots/UserCreateInputWithVisibility.graphql"
      )
    })

    it("should wrap required fields with GraphQLNonNull in createInput", async () => {
      const createInputType = inputFactory.createInput()
      const fields = createInputType.getFields()

      expect(fields.id.type.toString()).toEqual("ID")
      expect(fields.name.type.toString()).toEqual("String!")
      expect(fields.email.type.toString()).toEqual("String!")
      expect(fields.password.type.toString()).toEqual("String!")
      expect(fields.age.type.toString()).toEqual("Float") // nullable field
      expect(fields.isActive.type.toString()).toEqual("Boolean") // nullable field
    })

    it("should respect custom silk type for fields in createInput", async () => {
      // Define a custom GraphQLScalarType that mirrors GraphQLFloat for testing purposes
      const CustomFloatScalar = new GraphQLScalarType({
        name: "CustomFloat",
        serialize: GraphQLFloat.serialize,
        parseValue: GraphQLFloat.parseValue,
        parseLiteral: GraphQLFloat.parseLiteral,
      })
      const CustomAgeSilk = silk(CustomFloatScalar, (value: number) => ({
        value: value * 10,
      }))
      const inputFactoryWithCustomType = new MikroInputFactory(User, {
        getEntityManager: async () => ({}) as any,
        input: {
          age: {
            create: CustomAgeSilk,
          },
        },
      })

      const createInputType = inputFactoryWithCustomType.createInput()
      await expect(printType(createInputType)).toMatchFileSnapshot(
        "./snapshots/UserCreateInputWithCustomAgeType.graphql"
      )
    })
  })

  describe("createArgs", () => {
    it("should generate CreateArgs type for an entity", async () => {
      const createArgsType = inputFactory.createArgs()
      await expect(printType(createArgsType)).toMatchFileSnapshot(
        "./snapshots/UserCreateArgs.graphql"
      )
    })

    it("should respect field visibility in createArgs (nested createInput)", async () => {
      const inputFactoryWithVisibility = new MikroInputFactory(User, {
        getEntityManager: async () => ({}) as any,
        input: {
          password: false, // Hide password from create
          age: {
            create: false, // Hide age from create
          },
          "*": {
            create: true, // Show everything else
          },
        },
      })

      const createArgsType = inputFactoryWithVisibility.createArgs()
      await expect(printType(createArgsType)).toMatchFileSnapshot(
        "./snapshots/UserCreateArgsWithVisibility.graphql"
      )

      // Verify that the createInput type within createArgs also respects visibility
      const createInputType = inputFactoryWithVisibility.createInput()
      await expect(printType(createInputType)).toMatchFileSnapshot(
        "./snapshots/UserCreateInputNestedInCreateArgsWithVisibility.graphql"
      )
    })
  })

  describe("insertArgs", () => {
    it("should generate InsertArgs type for an entity", async () => {
      const insertArgsType = inputFactory.insertArgs()
      await expect(printType(insertArgsType)).toMatchFileSnapshot(
        "./snapshots/UserInsertArgs.graphql"
      )
    })
  })

  describe("insertManyArgs", () => {
    it("should generate InsertManyArgs type for an entity", async () => {
      const insertManyArgsType = inputFactory.insertManyArgs()
      await expect(printType(insertManyArgsType)).toMatchFileSnapshot(
        "./snapshots/UserInsertManyArgs.graphql"
      )
    })
  })

  describe("deleteArgs", () => {
    it("should generate DeleteArgs type for an entity", async () => {
      const deleteArgsType = inputFactory.deleteArgs()
      await expect(printType(deleteArgsType)).toMatchFileSnapshot(
        "./snapshots/UserDeleteArgs.graphql"
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

    it("should respect GraphQLSilk behavior", () => {
      const behaviors: MikroFactoryPropertyBehaviors<IUser> = {
        name: { "~standard": "some_silk_value" as any }, // Simulate GraphQLSilk
      }
      expect(
        MikroInputFactory.isPropertyVisible("name", behaviors, "filters")
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
      public transformFilters(args: FilterArgs<TEntity>): FilterQuery<TEntity>
      public transformFilters(
        args: FilterArgs<TEntity> | undefined
      ): FilterQuery<TEntity> | undefined
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

  describe("getPropertyConfig", () => {
    it("should return undefined by default", () => {
      expect(
        MikroInputFactory.getPropertyConfig(undefined, "name", "create")
      ).toBeUndefined()
    })

    it("should return direct GraphQLSilk behavior", () => {
      const customSilk = silk(new GraphQLNonNull(GraphQLString), (value) => ({
        value,
      }))
      const behaviors: MikroFactoryPropertyBehaviors<IUser> = {
        name: customSilk,
      }
      expect(
        MikroInputFactory.getPropertyConfig(behaviors, "name", "create")
      ).toBe(customSilk)
    })

    it("should return operation-specific GraphQLSilk behavior", () => {
      const customSilk = silk(new GraphQLNonNull(GraphQLString), (value) => ({
        value,
      }))
      const behaviors: MikroFactoryPropertyBehaviors<IUser> = {
        name: {
          create: customSilk,
        },
      }
      expect(
        MikroInputFactory.getPropertyConfig(behaviors, "name", "create")
      ).toBe(customSilk)
    })

    it("should return undefined if no matching behavior", () => {
      const behaviors: MikroFactoryPropertyBehaviors<IUser> = {
        name: false, // Not a silk object
      }
      expect(
        MikroInputFactory.getPropertyConfig(behaviors, "name", "create")
      ).toBeUndefined()
    })
  })
})
