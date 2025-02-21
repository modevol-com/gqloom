import {
  type GQLoomExtensions,
  type GraphQLSilk,
  getGraphQLType,
  isSilk,
  silk,
} from "@gqloom/core"
import { EntitySchema, MikroORM, RequestContext } from "@mikro-orm/core"
import { defineConfig } from "@mikro-orm/libsql"
import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  type GraphQLNamedType,
  GraphQLNonNull,
  GraphQLObjectType,
  type GraphQLOutputType,
  GraphQLScalarType,
  GraphQLString,
  printType,
} from "graphql"
import { beforeAll, describe, expect, it } from "vitest"
import { weaveEntitySchemaBySilk } from "../src/entity-schema"
import type { GQLoomMikroFieldExtensions } from "../src/types"
import { unwrapGraphQLType } from "../src/utils"

declare module "graphql" {
  interface GraphQLFieldExtensions<_TSource, _TContext, _TArgs = any>
    extends GQLoomMikroFieldExtensions,
      GQLoomExtensions {}
}

interface IGiraffe {
  id?: string | number
  name: string
  age?: number
  birthDay?: Date
  height: number
  isMale?: boolean
  hobbies?: string[]
}

const GraphQLDate = new GraphQLScalarType<Date, string>({
  name: "Date",
})

const Giraffe = silk<Required<IGiraffe>, IGiraffe>(
  new GraphQLObjectType({
    name: "Giraffe",
    fields: {
      id: {
        type: new GraphQLNonNull(GraphQLID),
        extensions: {
          mikroProperty: { primary: true, columnType: "INTEGER" },
          defaultValue: increasingId,
        },
      },
      name: { type: new GraphQLNonNull(GraphQLString) },
      age: { type: GraphQLInt, extensions: { defaultValue: 2 } },
      birthDay: {
        type: GraphQLDate,
        extensions: { defaultValue: () => new Date() },
      },
      height: { type: new GraphQLNonNull(GraphQLFloat) },
      isMale: {
        type: GraphQLBoolean,
        extensions: { defaultValue: true },
      },
      hobbies: {
        type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
        extensions: {
          defaultValue: () => [],
        },
      },
    },
  })
)

const GiraffeSchema = weaveEntitySchemaBySilk(Giraffe)
const ORMConfig = defineConfig({
  entities: [GiraffeSchema],
  dbName: ":memory:",
})

describe("Entity Schema", () => {
  it("should create a schema", () => {
    expect(GiraffeSchema).toBeInstanceOf(EntitySchema)
  })

  describe("weaveEntitySchema", () => {
    it("should convert to GraphQL type", () => {
      const fromEntity = getGraphQLType(
        GiraffeSchema.nullable()
      ) as GraphQLObjectType

      expect(printSilk(fromEntity)).toMatchInlineSnapshot(`
        "type Giraffe {
          id: ID!
          name: String!
          age: Int!
          birthDay: Date!
          height: Float!
          isMale: Boolean!
          hobbies: [String!]!
        }"
      `)

      const fromSilk = getGraphQLType(Giraffe) as GraphQLObjectType

      expect(printSilk(fromSilk)).toMatchInlineSnapshot(`
        "type Giraffe {
          id: ID!
          name: String!
          age: Int
          birthDay: Date
          height: Float!
          isMale: Boolean
          hobbies: [String!]
        }"
      `)
    })

    it("should keep origin GraphQL Field Type", () => {
      const fromEntity = getGraphQLType(
        GiraffeSchema.nullable()
      ) as GraphQLObjectType

      const fromSilk = getGraphQLType(Giraffe) as GraphQLObjectType

      Object.keys(fromEntity.getFields()).forEach((key) => {
        const typeFromEntity = unwrapGraphQLType(
          fromEntity.getFields()[key].type
        )
        const typeFromSilk = unwrapGraphQLType(fromSilk.getFields()[key].type)

        expect(typeFromEntity).toEqual(typeFromSilk)
      })
    })
  })
})

describe("Entity Manager", () => {
  let orm = {} as MikroORM
  beforeAll(async () => {
    orm = await MikroORM.init(ORMConfig)
    await orm.getSchemaGenerator().updateSchema()
  })

  it("should be able to create, find, update, delete", async () => {
    // create
    const g1 = await RequestContext.create(orm.em, async () => {
      const g1 = orm.em.create(GiraffeSchema, { name: "Galaxy", height: 1.5 })
      await orm.em.persistAndFlush(g1)
      return g1
    })

    // find
    const Galaxy = await RequestContext.create(orm.em, async () => {
      return orm.em.findOneOrFail(GiraffeSchema, { id: g1.id })
    })

    expect(Galaxy).toMatchObject({
      id: 1,
      name: "Galaxy",
      age: 2,
      height: 1.5,
      isMale: true,
      hobbies: [],
    })

    // update
    await RequestContext.create(orm.em, async () => {
      const g2 = await orm.em.findOneOrFail(GiraffeSchema, { id: g1.id })
      g2.name = "Galaxy2"
      g2.height = 3
      await orm.em.persistAndFlush(g2)
      return g2
    })

    const g2 = await RequestContext.create(orm.em, async () => {
      return orm.em.findOneOrFail(GiraffeSchema, { id: g1.id })
    })

    expect(g2).toMatchObject({
      id: 1,
      name: "Galaxy2",
      age: 2,
      height: 3,
      isMale: true,
      hobbies: [],
    })

    // delete
    await RequestContext.create(orm.em, async () => {
      const g3 = await orm.em.findOneOrFail(GiraffeSchema, { id: g1.id })
      return orm.em.removeAndFlush(g3)
    })

    await expect(
      RequestContext.create(orm.em, async () => {
        return orm.em.findOne(GiraffeSchema, { id: g1.id })
      })
    ).resolves.toBeNull()
  })
})

let id = 0
function increasingId() {
  return ++id
}

function printSilk(silkOrType: GraphQLSilk | GraphQLOutputType) {
  if (isSilk(silkOrType)) {
    const gqlType = getGraphQLType(silkOrType)
    if (gqlType instanceof GraphQLNonNull) {
      return printType(gqlType.ofType as GraphQLNamedType)
    }
    return printType(gqlType as GraphQLNamedType)
  }
  if (silkOrType instanceof GraphQLNonNull) {
    return printType(silkOrType.ofType as GraphQLNamedType)
  }
  return printType(silkOrType as GraphQLNamedType)
}
