import { silk } from "@gqloom/core"
import {
  EntitySchema,
  MikroORM,
  type RequiredEntityData,
  defineConfig,
  RequestContext,
} from "@mikro-orm/better-sqlite"
import { describe, expect, expectTypeOf, it } from "vitest"
import { mikroSilk } from "../src"
import { MikroOperationWeaver } from "../src/operations"
import { GraphQLObjectType } from "graphql"

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

describe("MikroOperationsWeaver", () => {
  describe("pieceCreate", async () => {
    const orm = await MikroORM.init(ORMConfig)
    await orm.getSchemaGenerator().updateSchema()

    const weaver = new MikroOperationWeaver(Giraffe, () => orm.em)
    const create = weaver.pieceCreate()
    it("should infer Input type", () => {
      weaver.pieceCreate({
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
})