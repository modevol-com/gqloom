import { getGraphQLType, silk } from "@gqloom/core"
import {
  EntitySchema,
  MikroORM,
  type RequiredEntityData,
  defineConfig,
  RequestContext,
} from "@mikro-orm/better-sqlite"
import { describe, expect, expectTypeOf, it } from "vitest"
import { mikroSilk } from "../src"
import {
  type FindOneParameters,
  MikroOperationBobbin,
  type UpdateInput,
} from "../src/operations"
import { GraphQLObjectType, printType } from "graphql"

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
      id: {
        type: "number",
        primary: true,
      },
      name: {
        type: "string",
      },
      birthday: {
        type: "Date",
      },
      height: {
        type: "number",
        nullable: true,
      },
    },
  })
)
const ORMConfig = defineConfig({
  entities: [Giraffe],
  dbName: ":memory:",
  // debug: true,
})

describe("MikroOperationsBobbin", async () => {
  const orm = await MikroORM.init(ORMConfig)
  await orm.getSchemaGenerator().updateSchema()

  const bobbin = new MikroOperationBobbin(Giraffe, () => orm.em)
  describe("CreateMutation", () => {
    const create = bobbin.CreateMutation()
    it("should infer Input type", () => {
      bobbin.CreateMutation({
        input: silk<Omit<IGiraffe, "height" | "id">>(
          new GraphQLObjectType({ name: "CreateGiraffeInput", fields: {} })
        ),
      })
      expectTypeOf(create.resolve)
        .parameter(0)
        .toEqualTypeOf<RequiredEntityData<IGiraffe>>()
    })

    it("should infer Output type", () => {
      expectTypeOf(create.resolve).returns.resolves.toEqualTypeOf<IGiraffe>()
    })

    it("should create Create Default Input", () => {
      const silk = bobbin.CreateInput()
      expect(printType(getGraphQLType(silk) as GraphQLObjectType))
        .toMatchInlineSnapshot(`
        "type GiraffeCreateInput {
          id: ID
          name: String!
          birthday: String!
          height: Float
        }"
      `)
    })

    it("should do create", async () => {
      const one = await RequestContext.create(orm.em, () =>
        create.resolve({
          name: "Foo",
          birthday: new Date(),
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
  })

  describe("UpdateMutation", async () => {
    const update = bobbin.UpdateMutation()
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
      bobbin.UpdateMutation({
        input: silk<Omit<IGiraffe, "height">>(
          new GraphQLObjectType({ name: "UpdateGiraffeInput", fields: {} })
        ),
      })

      expectTypeOf(update.resolve)
        .parameter(0)
        .toEqualTypeOf<UpdateInput<IGiraffe>>()
    })

    it("should infer output type", () => {
      expectTypeOf(update.resolve).returns.resolves.toEqualTypeOf<IGiraffe>()
    })

    it("should create Update Default Input", () => {
      const silk = bobbin.UpdateInput()
      expect(printType(getGraphQLType(silk) as GraphQLObjectType))
        .toMatchInlineSnapshot(`
        "type GiraffeUpdateInput {
          id: ID!
          name: String
          birthday: String
          height: Float
        }"
      `)
    })

    it("should do update", async () => {
      await RequestContext.create(orm.em, () =>
        update.resolve({
          id: giraffe.id,
          height: 2,
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
  })

  describe("FindOneQuery", async () => {
    const findOne = bobbin.FindOneQuery()
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
      bobbin.FindOneQuery({
        input: silk<Omit<IGiraffe, "height">>(
          new GraphQLObjectType({ name: "FindOneGiraffeInput", fields: {} })
        ),
      })

      expectTypeOf(findOne.resolve)
        .parameter(0)
        .toEqualTypeOf<FindOneParameters<IGiraffe>>()
    })

    it("should infer output type", () => {
      expectTypeOf(findOne.resolve).returns.resolves.toEqualTypeOf<IGiraffe>()
    })

    it("should create FindOne Default Input", () => {
      const silk = bobbin.FindOneParameters()
      expect(printType(getGraphQLType(silk) as GraphQLObjectType))
        .toMatchInlineSnapshot(`
        "type GiraffeFindOneParameters {
          id: ID!
        }"
      `)
    })

    it("should do findOne", async () => {
      const g = await RequestContext.create(orm.em, () =>
        findOne.resolve({
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
    const deleteOne = bobbin.DeleteOneMutation()
    const giraffe = await RequestContext.create(orm.em, async () => {
      const g = orm.em.create(Giraffe, {
        name: "Foo",
        birthday: new Date(),
        height: 1,
      })
      await orm.em.persistAndFlush(g)
      return g
    })

    it("should do delete one", async () => {
      const g1 = await RequestContext.create(orm.em, () =>
        deleteOne.resolve({
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
        deleteOne.resolve({
          id: giraffe.id,
        })
      )

      expect(g2).toBeNull()
    })
  })
})
