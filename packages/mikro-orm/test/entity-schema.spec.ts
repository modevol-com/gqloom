import { type GraphQLSilk, getGraphQLType, silk, isSilk } from "@gqloom/core"
import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  type GraphQLNamedType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
  printType,
  type GraphQLOutputType,
} from "graphql"
import { type GQLoomMikroFieldExtensions } from "../src/types"
import { beforeAll, describe, expect, it } from "vitest"
import { mikroSilk } from "../src"
import { MikroORM, RequestContext } from "@mikro-orm/core"
import { defineConfig } from "@mikro-orm/better-sqlite"
import { weaveEntitySchemaBySilk } from "../src/entity-schema"

declare module "graphql" {
  interface GraphQLFieldExtensions<_TSource, _TContext, _TArgs = any>
    extends GQLoomMikroFieldExtensions {}
}

interface IGiraffe {
  id?: string | number
  name: string
  age?: number
  height: number
  isMale?: boolean
  hobbies?: string[]
}

const Giraffe = silk<Required<IGiraffe>, IGiraffe>(
  new GraphQLObjectType({
    name: "Giraffe",
    fields: {
      id: {
        type: new GraphQLNonNull(GraphQLID),
        extensions: { mikroProperty: { primary: true, columnType: "INTEGER" } },
      },
      name: { type: new GraphQLNonNull(GraphQLString) },
      age: { type: new GraphQLNonNull(GraphQLInt) },
      height: { type: new GraphQLNonNull(GraphQLFloat) },
      isMale: { type: new GraphQLNonNull(GraphQLBoolean) },
      hobbies: {
        type: new GraphQLNonNull(
          new GraphQLList(new GraphQLNonNull(GraphQLString))
        ),
      },
    },
  }),
  (input) => {
    return {
      id: increasingId(),
      age: 2,
      isMale: true,
      hobbies: [],
      ...input,
    }
  }
)

const GiraffeSchema = weaveEntitySchemaBySilk(Giraffe)
const ORMConfig = defineConfig({
  entities: [GiraffeSchema],
  dbName: ":memory:",
})

describe("Entity Schema", () => {
  it("should create a schema", () => {
    expect(GiraffeSchema.meta).toMatchInlineSnapshot(`
      EntityMetadata {
        "_id": 0,
        "abstract": false,
        "checks": [],
        "className": "Giraffe",
        "concurrencyCheckKeys": Set {},
        "filters": {},
        "hooks": {
          "onInit": [
            [Function],
          ],
        },
        "indexes": [],
        "name": "Giraffe",
        "primaryKeys": [],
        "properties": {
          "age": {
            "nullable": false,
            "type": "integer",
          },
          "height": {
            "nullable": false,
            "type": "float",
          },
          "hobbies": {
            "nullable": false,
            "type": "string[]",
          },
          "id": {
            "columnType": "INTEGER",
            "nullable": false,
            "primary": true,
            "type": "string",
          },
          "isMale": {
            "nullable": false,
            "type": "boolean",
          },
          "name": {
            "nullable": false,
            "type": "string",
          },
        },
        "propertyOrder": Map {},
        "props": [],
        "referencingProperties": [],
        "root": [Circular],
        "uniques": [],
      }
    `)
  })

  it("should generate schema SQL", async () => {
    const orm = await MikroORM.init(ORMConfig)
    expect(orm.getSchemaGenerator().getCreateSchemaSQL()).resolves
      .toMatchInlineSnapshot(`
      "pragma foreign_keys = off;

      create table \`giraffe\` (\`id\` integer not null primary key autoincrement, \`name\` text not null, \`age\` integer not null, \`height\` real not null, \`is_male\` integer not null, \`hobbies\` text not null);

      pragma foreign_keys = on;
      "
    `)
  })

  it("should convert to GraphQL type", () => {
    const gqlType = getGraphQLType(
      mikroSilk(GiraffeSchema)
    ) as GraphQLObjectType
    expect(printSilk(getGraphQLType(Giraffe) as GraphQLObjectType)).toEqual(
      printSilk(getGraphQLType(Giraffe) as GraphQLObjectType)
    )

    expect(printSilk(gqlType)).toMatchInlineSnapshot(`
      "type Giraffe {
        id: ID!
        name: String!
        age: Int!
        height: Float!
        isMale: Boolean!
        hobbies: [String!]!
      }"
    `)
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

    expect(Galaxy).toMatchInlineSnapshot(`
      {
        "age": 2,
        "height": 1.5,
        "hobbies": [],
        "id": 1,
        "isMale": true,
        "name": "Galaxy",
      }
    `)

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

    expect(g2).toMatchInlineSnapshot(`
      {
        "age": 2,
        "height": 3,
        "hobbies": [],
        "id": 1,
        "isMale": true,
        "name": "Galaxy2",
      }
    `)

    // delete
    await RequestContext.create(orm.em, async () => {
      const g3 = await orm.em.findOneOrFail(GiraffeSchema, { id: g1.id })
      return orm.em.removeAndFlush(g3)
    })

    expect(
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
