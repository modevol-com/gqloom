import { getGraphQLType, silk } from "@gqloom/core"
import {
  defineEntity,
  type FilterQuery,
  type InferEntity,
} from "@mikro-orm/libsql"
import {
  GraphQLFloat,
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLString,
  printType,
} from "graphql"
import { describe, expect, it } from "vitest"
import { mikroSilk } from "../src"
import {
  type FilterArgs,
  type MikroFactoryPropertyBehaviors,
  MikroInputFactory,
} from "../src/factory"

const User = mikroSilk(
  defineEntity({
    name: "User",
    properties: (p) => ({
      id: p.integer().primary().autoincrement(),
      name: p.string(),
      email: p.string(),
      password: p.string(),
      age: p.integer().nullable(),
      isActive: p.boolean().nullable(),
    }),
  })
)

interface IUser extends InferEntity<typeof User> {}

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
      const createInputType = inputFactory.requiredInput()
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

      const createInputType = inputFactoryWithVisibility.requiredInput()
      await expect(printType(createInputType)).toMatchFileSnapshot(
        "./snapshots/UserCreateInputWithVisibility.graphql"
      )
    })

    it("should wrap required fields with GraphQLNonNull in createInput", async () => {
      const createInputType = inputFactory.requiredInput()
      const fields = createInputType.getFields()

      expect(fields.id.type.toString()).toEqual("ID")
      expect(fields.name.type.toString()).toEqual("String!")
      expect(fields.email.type.toString()).toEqual("String!")
      expect(fields.password.type.toString()).toEqual("String!")
      expect(fields.age.type.toString()).toEqual("Int") // nullable field
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

      const createInputType = inputFactoryWithCustomType.requiredInput()
      await expect(printType(createInputType)).toMatchFileSnapshot(
        "./snapshots/UserCreateInputWithCustomAgeType.graphql"
      )
    })

    it("should respect GraphQLOutputType / GraphQLInputType for fields in createInput (no validation)", async () => {
      const inputFactoryWithGraphQLType = new MikroInputFactory(User, {
        getEntityManager: async () => ({}) as any,
        input: {
          age: GraphQLFloat,
        },
      })

      const createInputType = inputFactoryWithGraphQLType.requiredInput()
      await expect(printType(createInputType)).toMatchFileSnapshot(
        "./snapshots/UserCreateInputWithGraphQLAgeType.graphql"
      )
      expect(createInputType.getFields().age.type.toString()).toEqual("Float")
    })

    it("should respect GraphQLOutputType in PropertyBehavior.create for createInput", async () => {
      const inputFactoryWithGraphQLType = new MikroInputFactory(User, {
        getEntityManager: async () => ({}) as any,
        input: {
          age: {
            create: GraphQLFloat,
          },
        },
      })

      const createInputType = inputFactoryWithGraphQLType.requiredInput()
      expect(createInputType.getFields().age.type.toString()).toEqual("Float")
    })

    it("should use mikroSilk.config.fields (entity field config) for createInput when options.input has no override", async () => {
      const UserWithAgeFloat = mikroSilk(
        defineEntity({
          name: "UserWithAgeFloat",
          properties: (p) => ({
            id: p.integer().primary().autoincrement(),
            name: p.string(),
            age: p.integer().nullable(),
          }),
        }),
        { fields: { age: GraphQLFloat } }
      )
      getGraphQLType(UserWithAgeFloat)
      const inputFactoryFromEntityConfig = new MikroInputFactory(
        UserWithAgeFloat,
        { getEntityManager: async () => ({}) as any }
      )
      const createInputType = inputFactoryFromEntityConfig.requiredInput()
      expect(createInputType.getFields().age.type.toString()).toEqual("Float")
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
      const createInputType = inputFactoryWithVisibility.requiredInput()
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

  describe("updateInput", () => {
    it("should generate UpdateInput type for an entity", async () => {
      const updateInputType = inputFactory.partialInput()
      await expect(printType(updateInputType)).toMatchFileSnapshot(
        "./snapshots/UserUpdateInput.graphql"
      )
    })

    it("should respect GraphQLOutputType for fields in updateInput (partialInput)", async () => {
      const inputFactoryWithGraphQLType = new MikroInputFactory(User, {
        getEntityManager: async () => ({}) as any,
        input: {
          age: {
            update: GraphQLFloat,
          },
        },
      })

      const updateInputType = inputFactoryWithGraphQLType.partialInput()
      await expect(printType(updateInputType)).toMatchFileSnapshot(
        "./snapshots/UserUpdateInputWithGraphQLAgeType.graphql"
      )
      expect(updateInputType.getFields().age.type.toString()).toEqual("Float")
    })

    it("should make non-primary required fields optional in partialInput", () => {
      const updateInputType = inputFactory.partialInput()
      // name is required (non-null) on entity but partialInput strips NonNull for non-primary keys
      expect(updateInputType.getFields().name.type.toString()).not.toMatch(/!$/)
      expect(updateInputType.getFields().name.type.toString()).toBe("String")
    })
  })

  describe("updateArgs", () => {
    it("should generate UpdateArgs type for an entity", async () => {
      const updateArgsType = inputFactory.updateArgs()
      await expect(printType(updateArgsType)).toMatchFileSnapshot(
        "./snapshots/UserUpdateArgs.graphql"
      )
    })
  })

  describe("upsertArgs", () => {
    it("should generate UpsertArgs type for an entity", async () => {
      const upsertArgsType = inputFactory.upsertArgs()
      await expect(printType(upsertArgsType)).toMatchFileSnapshot(
        "./snapshots/UserUpsertArgs.graphql"
      )
    })
  })

  describe("upsertManyArgs", () => {
    it("should generate UpsertManyArgs type for an entity", async () => {
      const upsertManyArgsType = inputFactory.upsertManyArgs()
      await expect(printType(upsertManyArgsType)).toMatchFileSnapshot(
        "./snapshots/UserUpsertManyArgs.graphql"
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
    it("should return undefined for undefined input", () => {
      expect(MikroInputFactory.transformFilters(undefined)).toBeUndefined()
    })

    it("should handle an empty filter object", () => {
      expect(MikroInputFactory.transformFilters({})).toEqual({})
    })

    it("should transform simple equality filter", () => {
      const args: FilterArgs<IUser> = { name: { eq: "John" } }
      const expected = { name: { $eq: "John" } }
      expect(MikroInputFactory.transformFilters(args)).toEqual(expected)
    })

    it("should transform multiple simple filters", () => {
      const args: FilterArgs<IUser> = { name: { eq: "John" }, age: { gt: 30 } }
      const expected = { name: { $eq: "John" }, age: { $gt: 30 } }
      expect(MikroInputFactory.transformFilters(args)).toEqual(expected)
    })

    it("should return an empty object for empty logical operator arrays", () => {
      const args: FilterArgs<IUser> = { AND: [], OR: [] }
      const expected = { $and: [], $or: [] }
      expect(MikroInputFactory.transformFilters(args)).toEqual(expected)
    })

    it("should transform uppercase 'AND' condition", () => {
      const args: FilterArgs<IUser> = {
        AND: [{ name: { like: "%Doe" } }, { age: { lte: 40 } }],
      }
      const expected: FilterQuery<IUser> = {
        $and: [{ name: { $like: "%Doe" } }, { age: { $lte: 40 } }],
      }
      expect(MikroInputFactory.transformFilters(args)).toEqual(expected)
    })

    it("should transform uppercase 'OR' condition", () => {
      const args: FilterArgs<IUser> = {
        OR: [{ isActive: { eq: true } }, { age: { in: [25, 35, 45] } }],
      }
      const expected: FilterQuery<IUser> = {
        $or: [{ isActive: { $eq: true } }, { age: { $in: [25, 35, 45] } }],
      }
      expect(MikroInputFactory.transformFilters(args)).toEqual(expected)
    })

    it("should transform uppercase 'NOT' condition", () => {
      const args: FilterArgs<IUser> = {
        NOT: { name: { eq: "Guest" } },
      }
      const expected: FilterQuery<IUser> = {
        $not: { name: { $eq: "Guest" } },
      }
      expect(MikroInputFactory.transformFilters(args)).toEqual(expected)
    })

    it("should combine uppercase logical operators with root-level conditions", () => {
      const args: FilterArgs<IUser> = {
        name: { eq: "Admin" },
        OR: [{ age: { gt: 60 } }, { isActive: { eq: false } }],
        NOT: { email: { like: "%test%" } },
      }
      const expected: FilterQuery<IUser> = {
        name: { $eq: "Admin" },
        $or: [{ age: { $gt: 60 } }, { isActive: { $eq: false } }],
        $not: { email: { $like: "%test%" } },
      }
      expect(MikroInputFactory.transformFilters(args)).toEqual(expected)
    })

    it("should handle nested uppercase logical operators", () => {
      const args: FilterArgs<IUser> = {
        OR: [
          { name: { eq: "Jane" } },
          {
            AND: [{ age: { gte: 20 } }, { age: { lt: 30 } }],
          },
        ],
        NOT: { isActive: { eq: false } },
      }
      const expected: FilterQuery<IUser> = {
        $or: [
          { name: { $eq: "Jane" } },
          {
            $and: [{ age: { $gte: 20 } }, { age: { $lt: 30 } }],
          },
        ],
        $not: { isActive: { $eq: false } },
      }
      expect(MikroInputFactory.transformFilters(args)).toEqual(expected)
    })

    it("should handle mixed case logical operators", () => {
      const args: FilterArgs<IUser> = {
        AND: [{ name: { eq: "John" } }],
        OR: [{ age: { gt: 30 } }],
        NOT: { isActive: { eq: false } },
      }
      const expected: FilterQuery<IUser> = {
        $and: [{ name: { $eq: "John" } }],
        $or: [{ age: { $gt: 30 } }],
        $not: { isActive: { $eq: false } },
      }
      expect(MikroInputFactory.transformFilters(args)).toEqual(expected)
    })

    it("should preserve keys that start with $", () => {
      const args = {
        name: { eq: "x" },
        $and: [{ age: { gt: 18 } }],
        $custom: "value",
      }
      const expected = {
        name: { $eq: "x" },
        $and: [{ age: { $gt: 18 } }],
        $custom: "value",
      }
      expect(
        MikroInputFactory.transformFilters(args as FilterArgs<IUser>)
      ).toEqual(expected)
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

    it("should return GraphQL type when behavior is direct GraphQL type", () => {
      const behaviors: MikroFactoryPropertyBehaviors<IUser> = {
        age: GraphQLFloat,
      }
      expect(
        MikroInputFactory.getPropertyConfig(behaviors, "age", "create")
      ).toBe(GraphQLFloat)
      expect(
        MikroInputFactory.getPropertyConfig(behaviors, "age", "update")
      ).toBe(GraphQLFloat)
    })

    it("should return GraphQL type when behavior is PropertyBehavior with create/update as GraphQL type", () => {
      const behaviors: MikroFactoryPropertyBehaviors<IUser> = {
        age: {
          create: GraphQLFloat,
          update: GraphQLFloat,
        },
      }
      expect(
        MikroInputFactory.getPropertyConfig(behaviors, "age", "create")
      ).toBe(GraphQLFloat)
      expect(
        MikroInputFactory.getPropertyConfig(behaviors, "age", "update")
      ).toBe(GraphQLFloat)
    })

    it("should return GraphQL type only for the operation that has it", () => {
      const behaviors: MikroFactoryPropertyBehaviors<IUser> = {
        age: {
          create: GraphQLFloat,
          update: false,
        },
      }
      expect(
        MikroInputFactory.getPropertyConfig(behaviors, "age", "create")
      ).toBe(GraphQLFloat)
      expect(
        MikroInputFactory.getPropertyConfig(behaviors, "age", "update")
      ).toBeUndefined()
    })
  })

  describe("PropertyBehavior with GraphQLOutputType / GraphQLInputType", () => {
    it("isPropertyVisible should return true when behavior is direct GraphQL type", () => {
      const behaviors: MikroFactoryPropertyBehaviors<IUser> = {
        age: GraphQLFloat,
      }
      expect(
        MikroInputFactory.isPropertyVisible("age", behaviors, "create")
      ).toBe(true)
      expect(
        MikroInputFactory.isPropertyVisible("age", behaviors, "update")
      ).toBe(true)
    })

    it("isPropertyVisible should return true when PropertyBehavior.create/update is GraphQL type", () => {
      const behaviors: MikroFactoryPropertyBehaviors<IUser> = {
        age: {
          create: GraphQLFloat,
          update: GraphQLFloat,
        },
      }
      expect(
        MikroInputFactory.isPropertyVisible("age", behaviors, "create")
      ).toBe(true)
      expect(
        MikroInputFactory.isPropertyVisible("age", behaviors, "update")
      ).toBe(true)
    })

    it("isPropertyVisible should return true when defaultBehavior (*) is object with GraphQL type for operation", () => {
      const behaviors: MikroFactoryPropertyBehaviors<IUser> = {
        "*": {
          create: GraphQLFloat,
          update: GraphQLFloat,
        },
      }
      expect(
        MikroInputFactory.isPropertyVisible("age", behaviors, "create")
      ).toBe(true)
      expect(
        MikroInputFactory.isPropertyVisible("age", behaviors, "update")
      ).toBe(true)
    })
  })
})
