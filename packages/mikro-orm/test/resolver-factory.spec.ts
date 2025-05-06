import {
  type CallableInputParser,
  type GraphQLSilk,
  getGraphQLType,
  resolver,
  silk,
  weave,
} from "@gqloom/core"
import {
  EntitySchema,
  MikroORM,
  RequestContext,
  type RequiredEntityData,
  defineConfig,
} from "@mikro-orm/libsql"
import {
  GraphQLFloat,
  GraphQLList,
  type GraphQLNamedType,
  GraphQLNonNull,
  GraphQLObjectType,
  type GraphQLOutputType,
  GraphQLString,
  printSchema,
  printType,
} from "graphql"
import { assertType, describe, expect, expectTypeOf, it } from "vitest"
import { mikroSilk } from "../src"
import {
  type FindOneFilter,
  MikroInputFactory,
  MikroResolverFactory,
  type UpdateInput,
} from "../src/resolver-factory"

interface IGiraffe {
  id: string
  name: string
  birthday: Date
  height?: number | null
}

const Giraffe = mikroSilk(
  new EntitySchema<IGiraffe>({
    name: "Giraffe",
    properties: {
      id: { type: "number", primary: true },
      name: { type: "string" },
      birthday: { type: "Date" },
      height: { type: "number", nullable: true },
    },
  })
)
const ORMConfig = defineConfig({
  entities: [Giraffe],
  dbName: ":memory:",
  // debug: true,
})

describe("MikroResolverFactory", async () => {
  const orm = await MikroORM.init(ORMConfig)
  await orm.getSchemaGenerator().updateSchema()

  const bobbin = new MikroResolverFactory(Giraffe, () => orm.em)
  const inputFactory = new MikroInputFactory(Giraffe)
  describe("CreateMutation", () => {
    const create = bobbin.createMutation()
    it("should infer Input type", () => {
      bobbin.createMutation({
        input: silk<Omit<IGiraffe, "height" | "id">>(
          new GraphQLObjectType({ name: "CreateGiraffeInput", fields: {} })
        ),
      })
      const executor = resolver({ create }).toExecutor()
      expectTypeOf(executor.create)
        .parameter(0)
        .toEqualTypeOf<{ data: RequiredEntityData<IGiraffe> }>()
    })

    it("should infer Output type", () => {
      expectTypeOf(
        create["~meta"].resolve
      ).returns.resolves.toEqualTypeOf<IGiraffe>()
    })

    it("should create Create Default Input", () => {
      const inputWarperSilk = inputFactory.createInput()
      expect(printSilk(inputWarperSilk)).toMatchInlineSnapshot(`
        "type GiraffeCreateInputWrapper {
          data: GiraffeCreateInput!
        }"
      `)

      const inputType = unwrap(
        (getGraphQLType(inputWarperSilk) as GraphQLObjectType).getFields()[
          "data"
        ].type
      )

      expect(printType(inputType)).toMatchInlineSnapshot(`
        "type GiraffeCreateInput {
          id: ID
          name: String!
          birthday: String!
          height: Float
        }"
      `)
    })

    it("should do create", async () => {
      const executor = resolver({ create }).toExecutor()
      const one = await RequestContext.create(orm.em, () =>
        executor.create({
          data: {
            name: "Foo",
            birthday: new Date(),
          },
        })
      )

      expect(one).toEqual({
        id: one.id,
        name: "Foo",
        birthday: expect.any(Date),
      })

      expect(await orm.em.fork().findOne(Giraffe, one.id)).toEqual({
        id: one.id,
        height: null,
        name: "Foo",
        birthday: expect.any(Date),
      })
    })

    it("should weave schema without error", () => {
      const r = resolver({ create })
      const schema = weave(r)
      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type Mutation {
          create(data: GiraffeCreateInput!): Giraffe!
        }

        type Giraffe {
          id: ID!
          name: String!
          birthday: String!
          height: Float
        }

        input GiraffeCreateInput {
          id: ID
          name: String!
          birthday: String!
          height: Float
        }"
      `)
    })
  })

  describe("UpdateMutation", async () => {
    const update = bobbin.updateMutation()
    const giraffe = await RequestContext.create(orm.em, async () => {
      const g = orm.em.create(Giraffe, {
        name: "Foo",
        birthday: new Date(),
        height: 1,
      })
      await orm.em.persistAndFlush(g)
      return g
    })

    it("should infer input type", () => {
      bobbin.updateMutation({
        input: silk<Omit<IGiraffe, "height">>(
          new GraphQLObjectType({ name: "UpdateGiraffeInput", fields: {} })
        ),
      })
      const executor = resolver({ update }).toExecutor()
      expectTypeOf(executor.update)
        .parameter(0)
        .toEqualTypeOf<{ data: UpdateInput<IGiraffe> }>()
    })

    it("should infer output type", () => {
      expectTypeOf(
        update["~meta"].resolve
      ).returns.resolves.toEqualTypeOf<IGiraffe>()
    })

    it("should create Update Default Input", () => {
      const inputWarperSilk = inputFactory.updateInput()
      expect(printSilk(inputWarperSilk)).toMatchInlineSnapshot(`
        "type GiraffeUpdateInputWrapper {
          data: GiraffeUpdateInput!
        }"
      `)

      const inputType = unwrap(
        (getGraphQLType(inputWarperSilk) as GraphQLObjectType).getFields()[
          "data"
        ].type
      )

      expect(printType(inputType)).toMatchInlineSnapshot(`
        "type GiraffeUpdateInput {
          id: ID!
          name: String
          birthday: String
          height: Float
        }"
      `)
    })

    it("should do update", async () => {
      const executor = resolver({ update }).toExecutor()
      await RequestContext.create(orm.em, () =>
        executor.update({
          data: {
            id: giraffe.id,
            height: 2,
          },
        })
      )
      const g = await RequestContext.create(orm.em, () =>
        orm.em.findOne(Giraffe, giraffe.id)
      )

      expect(g).toEqual({
        id: giraffe.id,
        name: "Foo",
        birthday: expect.any(Date),
        height: 2,
      })
    })

    it("should weave schema without error", () => {
      const r = resolver({ update })
      const schema = weave(r)
      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type Mutation {
          update(data: GiraffeUpdateInput!): Giraffe!
        }

        type Giraffe {
          id: ID!
          name: String!
          birthday: String!
          height: Float
        }

        input GiraffeUpdateInput {
          id: ID!
          name: String
          birthday: String
          height: Float
        }"
      `)
    })
  })

  describe("FindOneQuery", async () => {
    const findOne = bobbin.findOneQuery({
      middlewares: [
        async (opts) => {
          assertType<
            CallableInputParser<
              GraphQLSilk<FindOneFilter<IGiraffe>, FindOneFilter<IGiraffe>>
            >
          >(opts.parseInput)
          return opts.next()
        },
      ],
    })
    const giraffe = await RequestContext.create(orm.em, async () => {
      const g = orm.em.create(Giraffe, {
        name: "Foo",
        birthday: new Date(),
        height: 1,
      })
      await orm.em.persistAndFlush(g)
      return g
    })
    it("should infer input type", () => {
      bobbin.findOneQuery({
        input: silk<Omit<IGiraffe, "height">>(
          new GraphQLObjectType({ name: "FindOneGiraffeInput", fields: {} })
        ),
      })

      resolver({
        findOne: bobbin.findOneQuery({
          middlewares: [
            async (next) => {
              assertType<
                CallableInputParser<
                  GraphQLSilk<FindOneFilter<IGiraffe>, FindOneFilter<IGiraffe>>
                >
              >(next.parseInput)
              return next()
            },
          ],
        }),
      })

      expectTypeOf(findOne["~meta"].resolve)
        .parameter(0)
        .toEqualTypeOf<FindOneFilter<IGiraffe>>()
    })

    it("should infer output type", () => {
      expectTypeOf(
        findOne["~meta"].resolve
      ).returns.resolves.toEqualTypeOf<IGiraffe>()
    })

    it("should create FindOneOptions", () => {
      const silk = inputFactory.findOneFilter()
      expect(printSilk(silk)).toMatchInlineSnapshot(`
        "type GiraffeFindOneFilter {
          id: ID!
        }"
      `)
    })

    it("should do findOne", async () => {
      const g = await RequestContext.create(orm.em, () =>
        findOne["~meta"].resolve({
          id: giraffe.id,
        })
      )

      expect(g).toEqual({
        id: giraffe.id,
        name: "Foo",
        birthday: expect.any(Date),
        height: 1,
      })
    })
  })

  describe("DeleteOneMutation", async () => {
    const deleteOne = bobbin.deleteOneMutation()
    const giraffe = await RequestContext.create(orm.em, async () => {
      const g = orm.em.create(Giraffe, {
        name: "Foo",
        birthday: new Date(),
        height: 1,
      })
      await orm.em.persistAndFlush(g)
      return g
    })

    it("should infer output type", () => {
      expectTypeOf(
        deleteOne["~meta"].resolve
      ).returns.resolves.toEqualTypeOf<IGiraffe | null>()
    })

    it("should do delete one", async () => {
      const executor = resolver({ deleteOne }).toExecutor()
      const g1 = await RequestContext.create(orm.em, () =>
        executor.deleteOne({
          id: giraffe.id,
        })
      )

      expect(g1).toEqual({
        id: giraffe.id,
        name: "Foo",
        birthday: expect.any(Date),
        height: 1,
      })

      const g2 = await RequestContext.create(orm.em, () =>
        executor.deleteOne({
          id: giraffe.id,
        })
      )

      expect(g2).toBeNull()
    })
  })

  describe("FindManyQuery", () => {
    const findMany = bobbin.findManyQuery()
    it("should create operators type", () => {
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

    it("should create FindManyOptionsWhereType", () => {
      const whereType = inputFactory.findManyOptionsWhereType()
      expect(printType(whereType)).toMatchInlineSnapshot(`
        "type GiraffeFindManyOptionsWhere {
          id: IDMikroComparisonOperators
          name: StringMikroComparisonOperators
          birthday: StringMikroComparisonOperators
          height: FloatMikroComparisonOperators
        }"
      `)
    })

    it("should create QueryOrderType", () => {
      const queryOrderType = MikroInputFactory.queryOrderType()
      expect(printType(queryOrderType)).toMatchInlineSnapshot(`
        "enum MikroQueryOrder {
          ASC
          ASC_NULLS_LAST
          ASC_NULLS_FIRST
          DESC
          DESC_NULLS_LAST
          DESC_NULLS_FIRST
        }"
      `)
    })

    it("should create FindManyOptionsOrderBy", () => {
      const orderBy = inputFactory.findManyOptionsOrderByType()
      expect(printType(orderBy)).toMatchInlineSnapshot(`
        "type GiraffeFindManyOptionsOrderBy {
          id: MikroQueryOrder
          name: MikroQueryOrder
          birthday: MikroQueryOrder
          height: MikroQueryOrder
        }"
      `)
    })

    it("should create FindManyOptions", () => {
      const options = inputFactory.findManyOptions()
      expect(printSilk(options)).toMatchInlineSnapshot(`
        "type GiraffeFindManyOptions {
          where: GiraffeFindManyOptionsWhere
          orderBy: GiraffeFindManyOptionsOrderBy
          skip: Int
          limit: Int
        }"
      `)
    })

    it("should weave schema without error", () => {
      const r = resolver({ findMany, findMany2: findMany })
      const schema = weave(r)

      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type Query {
          findMany(where: GiraffeFindManyOptionsWhere, orderBy: GiraffeFindManyOptionsOrderBy, skip: Int, limit: Int): [Giraffe!]!
          findMany2(where: GiraffeFindManyOptionsWhere, orderBy: GiraffeFindManyOptionsOrderBy, skip: Int, limit: Int): [Giraffe!]!
        }

        type Giraffe {
          id: ID!
          name: String!
          birthday: String!
          height: Float
        }

        input GiraffeFindManyOptionsWhere {
          id: IDMikroComparisonOperators
          name: StringMikroComparisonOperators
          birthday: StringMikroComparisonOperators
          height: FloatMikroComparisonOperators
        }

        input IDMikroComparisonOperators {
          """Equals. Matches values that are equal to a specified value."""
          eq: ID

          """Greater. Matches values that are greater than a specified value."""
          gt: ID

          """
          Greater or Equal. Matches values that are greater than or equal to a specified value.
          """
          gte: ID

          """Contains, Contains, Matches any of the values specified in an array."""
          in: [ID!]

          """Lower, Matches values that are less than a specified value."""
          lt: ID

          """
          Lower or equal, Matches values that are less than or equal to a specified value.
          """
          lte: ID

          """Not equal. Matches all values that are not equal to a specified value."""
          ne: ID

          """Not contains. Matches none of the values specified in an array."""
          nin: [ID!]

          """&&"""
          overlap: [ID!]

          """@>"""
          contains: [ID!]

          """<@"""
          contained: [ID!]
        }

        input StringMikroComparisonOperators {
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
        }

        input FloatMikroComparisonOperators {
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
        }

        input GiraffeFindManyOptionsOrderBy {
          id: MikroQueryOrder
          name: MikroQueryOrder
          birthday: MikroQueryOrder
          height: MikroQueryOrder
        }

        enum MikroQueryOrder {
          ASC
          ASC_NULLS_LAST
          ASC_NULLS_FIRST
          DESC
          DESC_NULLS_LAST
          DESC_NULLS_FIRST
        }"
      `)
    })

    it("should convert to mikro condition", () => {
      const FindManyOptions = inputFactory.findManyOptions()

      expect(
        silk.parse(FindManyOptions, {
          where: { id: { eq: 1 } },
        })
      ).toMatchObject({
        where: { id: { $eq: 1 } },
      })

      expect(
        silk.parse(FindManyOptions, {
          where: { id: 1 },
        })
      ).toMatchObject({
        where: { id: 1 },
      })
    })
  })
})

function printSilk(silk: GraphQLSilk) {
  const gqlType = getGraphQLType(silk)
  if (gqlType instanceof GraphQLNonNull) {
    return printType(gqlType.ofType as GraphQLNamedType)
  }
  return printType(gqlType as GraphQLNamedType)
}

function unwrap(gqlType: GraphQLOutputType) {
  if (gqlType instanceof GraphQLNonNull) {
    return unwrap(gqlType.ofType)
  }
  if (gqlType instanceof GraphQLList) {
    return unwrap(gqlType.ofType)
  }
  return gqlType
}
