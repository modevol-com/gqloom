import {
  type GraphQLSilk,
  type Loom,
  type SchemaWeaver,
  collectNames,
  field,
  initWeaverContext,
  provideWeaverContext,
  query,
  resolver,
  silk,
  weave,
} from "@gqloom/core"
import * as JSONSchema from "effect/JSONSchema"
import * as Schema from "effect/Schema"
import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLList,
  type GraphQLNamedType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
  execute,
  parse,
  printSchema,
  printType,
} from "graphql"
import { describe, expect, it } from "vitest"
import { JSONWeaver } from "../src"

describe("effect/Schema", () => {
  it("should handle scalar", () => {
    expect(getGraphQLType(Schema.standardSchemaV1(Schema.String))).toEqual(
      new GraphQLNonNull(GraphQLString)
    )

    expect(
      getGraphQLType(Schema.standardSchemaV1(Schema.NullOr(Schema.String)))
    ).toEqual(GraphQLString)

    expect(getGraphQLType(Schema.standardSchemaV1(Schema.Number))).toEqual(
      new GraphQLNonNull(GraphQLFloat)
    )

    expect(getGraphQLType(Schema.standardSchemaV1(Schema.Boolean))).toEqual(
      new GraphQLNonNull(GraphQLBoolean)
    )
  })

  it("should handle array", () => {
    expect(
      getGraphQLType(Schema.standardSchemaV1(Schema.Array(Schema.String)))
    ).toEqual(
      new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString)))
    )

    expect(
      getGraphQLType(
        Schema.standardSchemaV1(Schema.Array(Schema.NullOr(Schema.String)))
      )
    ).toEqual(new GraphQLNonNull(new GraphQLList(GraphQLString)))

    expect(
      getGraphQLType(
        Schema.standardSchemaV1(Schema.NullOr(Schema.Array(Schema.String)))
      )
    )
  })

  it("should handle object", () => {
    const Cat = Schema.standardSchemaV1(
      Schema.Struct({
        __typename: Schema.tag("Cat"),
        name: Schema.String,
        age: Schema.Number,
        loveFish: Schema.NullOr(Schema.Boolean),
      })
    )

    const gqlType = getGraphQLType(Cat)
    expect(gqlType).toBeInstanceOf(GraphQLNonNull)
    expect((gqlType as GraphQLNonNull<any>).ofType).toBeInstanceOf(
      GraphQLObjectType
    )

    expect(printEffectSchema(Cat)).toMatchInlineSnapshot(`
      "type Cat {
        name: String!
        age: Float!
        loveFish: Boolean!
      }"
    `)
  })

  it("should avoid duplicate object", () => {
    const Dog = Schema.standardSchemaV1(
      Schema.Struct({
        __typename: Schema.tag("Dog"),
        name: Schema.String,
        birthday: Schema.String,
      })
    )

    const r1 = resolver.of(Dog, {
      dog: query(Dog).resolve(() => ({
        __typename: "Dog",
        name: "",
        birthday: "2012-12-12",
      })),
      dogs: query(silk.list(Dog)).resolve(() => [
        { __typename: "Dog", name: "", birthday: "2012-12-12" },
        { __typename: "Dog", name: "", birthday: "2012-12-12" },
      ]),
      mustDog: query(Dog).resolve(() => ({
        __typename: "Dog",
        name: "",
        birthday: "2012-12-12",
      })),
      mustDogs: query(silk.list(Dog)).resolve(() => []),
      age: field(Schema.standardSchemaV1(Schema.Number), (dog) => {
        return new Date().getFullYear() - new Date(dog.birthday).getFullYear()
      }),
    })

    expect(printResolver(r1)).toMatchInlineSnapshot(`
      "type Dog {
        name: String!
        birthday: String!
        age: Float!
      }

      type Query {
        dog: Dog!
        dogs: [Dog!]!
        mustDog: Dog!
        mustDogs: [Dog!]!
      }"
    `)
  })

  it("should handle enum", () => {
    const Fruit = Schema.standardSchemaV1(
      Schema.Literal("apple", "banana", "orange")
    )
    collectNames({ Fruit })

    expect(printEffectSchema(Fruit)).toMatchInlineSnapshot(`
      "enum Fruit {
        apple
        banana
        orange
      }"
    `)
  })

  it("should handle union as GraphQLUnionType", async () => {
    const Cat = Schema.standardSchemaV1(
      Schema.Struct({
        __typename: Schema.tag("Cat"),
        name: Schema.String,
        loveFish: Schema.Boolean,
      })
    )
    const Dog = Schema.standardSchemaV1(
      Schema.Struct({
        __typename: Schema.tag("Dog"),
        name: Schema.String,
        loveBone: Schema.Boolean,
      })
    )
    const Animal = Schema.standardSchemaV1(Schema.Union(Cat, Dog))
    collectNames({ Cat, Dog, Animal })

    expect(printEffectSchema(Animal)).toMatchInlineSnapshot(`
      "union Animal = Cat | Dog"
    `)

    const animals = [
      { __typename: "Cat" as const, name: "Fluffy", loveFish: true },
      { __typename: "Dog" as const, name: "Rex", loveBone: false },
      { __typename: "Cat" as const, name: "Whiskers", loveFish: false },
    ]

    const animalResolver = resolver({
      animals: query(silk.list(Animal)).resolve(() => animals),
    })

    const schema = weave(effectWeaver, animalResolver)

    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type Query {
        animals: [Animal!]!
      }

      union Animal = Cat | Dog

      type Cat {
        name: String!
        loveFish: Boolean!
      }

      type Dog {
        name: String!
        loveBone: Boolean!
      }"
    `)

    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          animals {
            __typename
            ... on Cat {
              name
              loveFish
            }
            ... on Dog {
              name
              loveBone
            }
          }
        }
      `),
    })

    expect(result.errors).toBeUndefined()
    expect(result.data).toEqual({
      animals: [
        { __typename: "Cat", name: "Fluffy", loveFish: true },
        { __typename: "Dog", name: "Rex", loveBone: false },
        { __typename: "Cat", name: "Whiskers", loveFish: false },
      ],
    })
  })

  describe.todo("should handle input types", () => {
    it.todo("should convert object schema to input type for mutations")

    it.todo("should handle nested input objects")

    it.todo("should handle array inputs")

    it.todo("should avoid duplicate input types")
  })
})

const effectWeaver: SchemaWeaver = {
  vendor: "effect",
  getGraphQLType: (type: Schema.Schema<any, any, any>) =>
    JSONWeaver.getGraphQLType(JSONSchema.make(type), {
      source: type,
    }),
}

function getGraphQLType(type: GraphQLSilk) {
  const context = initWeaverContext()
  context.vendorWeavers.set(effectWeaver.vendor, effectWeaver)
  return provideWeaverContext(() => silk.getType(type), context)
}

function printEffectSchema(type: GraphQLSilk) {
  let gqlType = getGraphQLType(type)
  while ("ofType" in gqlType) gqlType = gqlType.ofType
  return printType(gqlType as GraphQLNamedType)
}

function printResolver(...resolvers: Loom.Resolver[]): string {
  const schema = weave(effectWeaver, ...resolvers)
  return printSchema(schema)
}
