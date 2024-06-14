import { silk } from "@gqloom/core"
import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
  printType,
} from "graphql"
import { type GqloomMikroFieldExtensions } from "../src/types"
import { describe, expect, it } from "vitest"
import { defineEntitySchema, mikroSilk } from "../src"
import { MikroORM } from "@mikro-orm/core"
import { defineConfig } from "@mikro-orm/better-sqlite"

declare module "graphql" {
  interface GraphQLFieldExtensions<_TSource, _TContext, _TArgs = any>
    extends GqloomMikroFieldExtensions {}
}

interface GiraffeI {
  id?: string
  name: string
  age?: number
  height: number
  isMale?: boolean
  hobbies?: string[]
}

const Giraffe = silk<Required<GiraffeI>, GiraffeI>(
  new GraphQLObjectType({
    name: "Giraffe",
    fields: {
      id: {
        type: new GraphQLNonNull(GraphQLID),
        extensions: { mikroProperty: { primary: true } },
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
  (input) => ({
    id: Math.random().toString(36).slice(-5),
    age: Math.floor(Math.random() * 30),
    isMale: Math.random() > 0.5,
    hobbies: [],
    ...input,
  })
)

const GiraffeSchema = defineEntitySchema(Giraffe)
const ORMConfig = defineConfig({
  entities: [GiraffeSchema],
  dbName: ":memory:",
})
describe("entity-schema", () => {
  it("should create a schema", () => {
    expect(GiraffeSchema.meta).toMatchInlineSnapshot(`
      EntityMetadata {
        "_id": 0,
        "abstract": false,
        "checks": [],
        "className": "Giraffe",
        "concurrencyCheckKeys": Set {},
        "filters": {},
        "hooks": {},
        "indexes": [],
        "name": "Giraffe",
        "primaryKeys": [],
        "properties": {
          "age": {
            "nullable": false,
            "type": "int",
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

      create table \`giraffe\` (\`id\` text not null, \`name\` text not null, \`age\` integer not null, \`height\` real not null, \`is_male\` integer not null, \`hobbies\` text not null, primary key (\`id\`));

      pragma foreign_keys = on;
      "
    `)
  })

  it("should convert to GraphQL type", () => {
    const gqlType = mikroSilk(
      GiraffeSchema
    ).getGraphQLType() as GraphQLObjectType
    expect(printType(Giraffe.getGraphQLType() as GraphQLObjectType)).toEqual(
      printType(Giraffe.getGraphQLType() as GraphQLObjectType)
    )

    expect(printType(gqlType)).toMatchInlineSnapshot(`
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
