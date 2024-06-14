import { silk } from "@gqloom/core"
import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from "graphql"
import { type GqloomMikroFieldExtensions } from "../src/types"
import { describe, expect, it } from "vitest"
import { defineEntitySchema } from "../src"
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
      age: { type: GraphQLInt },
      height: { type: new GraphQLNonNull(GraphQLFloat) },
      isMale: { type: GraphQLBoolean },
    },
  }),
  ({ id, age, isMale, ...fields }) => ({
    id: id ?? Math.random().toString(36).slice(-5),
    age: age ?? Math.floor(Math.random() * 30),
    isMale: isMale ?? Math.random() > 0.5,
    ...fields,
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
            "nullable": true,
            "type": "int",
          },
          "height": {
            "nullable": false,
            "type": "float",
          },
          "id": {
            "nullable": true,
            "primary": true,
            "type": "string",
          },
          "isMale": {
            "nullable": true,
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

      create table \`giraffe\` (\`id\` text not null, \`name\` text not null, \`age\` integer null, \`height\` real not null, \`is_male\` integer null, primary key (\`id\`));

      pragma foreign_keys = on;
      "
    `)
  })
})
