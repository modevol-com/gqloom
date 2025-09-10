import { type Loom, field, query, resolver, silk, weave } from "@gqloom/core"
import Ajv from "ajv"
import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  type GraphQLNamedType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
  printSchema,
  printType,
} from "graphql"
import { describe, expect, it } from "vitest"
import { JSONWeaver, jsonSilk } from "../src"

const getGraphQLType = JSONWeaver.getGraphQLType

describe("JSONWeaver", () => {
  it("should handle scalar", () => {
    expect(getGraphQLType({ type: "string" })).toEqual(
      new GraphQLNonNull(GraphQLString)
    )
    expect(getGraphQLType({ type: ["string", "null"] })).toEqual(GraphQLString)
    expect(getGraphQLType({ type: "number" })).toEqual(
      new GraphQLNonNull(GraphQLFloat)
    )
    expect(getGraphQLType({ type: "integer" })).toEqual(
      new GraphQLNonNull(GraphQLInt)
    )
    expect(getGraphQLType({ type: "boolean" })).toEqual(
      new GraphQLNonNull(GraphQLBoolean)
    )
  })

  it("should handle default value as non-nullable", () => {
    expect(
      getGraphQLType({ type: ["string", "null"], default: "" })
    ).toBeInstanceOf(GraphQLNonNull)
  })

  it("should handle array", () => {
    expect(
      getGraphQLType({ type: "array", items: { type: "string" } })
    ).toEqual(
      new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString)))
    )

    expect(
      getGraphQLType({
        type: "array",
        items: { type: ["string", "null"] },
      })
    ).toEqual(new GraphQLNonNull(new GraphQLList(GraphQLString)))

    expect(
      getGraphQLType({
        type: ["array", "null"],
        items: { type: "string" },
      })
    ).toEqual(new GraphQLList(new GraphQLNonNull(GraphQLString)))
  })

  it("should handle object", () => {
    const CatSchema = {
      title: "Cat",
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "integer" },
        loveFish: { type: ["boolean", "null"] },
      },
      required: ["name", "age"],
    } as const

    const gqlType = getGraphQLType(CatSchema)
    expect(gqlType).toBeInstanceOf(GraphQLNonNull)
    expect((gqlType as GraphQLNonNull<any>).ofType).toBeInstanceOf(
      GraphQLObjectType
    )

    expect(printJSONSchema(CatSchema)).toMatchInlineSnapshot(`
      "type Cat {
        name: String!
        age: Int!
        loveFish: Boolean
      }"
    `)
  })

  it("should handle enum", () => {
    const FruitSchema = {
      title: "Fruit",
      description: "Some fruits you might like",
      enum: ["apple", "banana", "orange"],
    } as const

    expect(printJSONSchema(FruitSchema)).toMatchInlineSnapshot(`
      """"Some fruits you might like"""
      enum Fruit {
        apple
        banana
        orange
      }"
    `)
  })

  it("should handle oneOf as union", () => {
    const CatSchema = {
      title: "Cat",
      type: "object",
      properties: {
        name: { type: "string" },
      },
    } as const
    const DogSchema = {
      title: "Dog",
      type: "object",
      properties: {
        name: { type: "string" },
      },
    } as const
    const AnimalSchema = {
      title: "Animal",
      oneOf: [CatSchema, DogSchema],
    } as const

    const gqlType = getGraphQLType(AnimalSchema)
    expect(gqlType).toBeInstanceOf(GraphQLNonNull)
    const printed = printType(
      (gqlType as GraphQLNonNull<any>).ofType as GraphQLNamedType
    )
    expect(printed).toEqual("union Animal = Cat | Dog")
  })

  it("should work with ajv", () => {
    const Dog = jsonSilk({
      title: "Dog",
      type: "object",
      properties: {
        name: { type: "string" },
        birthday: { type: "string" },
      },
      required: ["name", "birthday"],
      additionalProperties: false,
    })
    const ajv = new Ajv()
    const validate = ajv.compile(Dog)
    expect(validate({ name: "Fido", birthday: "2012-12-12" })).toBe(true)
    expect(validate({ name: "Fido", birthday: "2012-12-12", age: 10 })).toBe(
      false
    )
  })

  describe("should avoid duplicate", () => {
    it("should avoid duplicate object", () => {
      const Dog = jsonSilk({
        title: "Dog",
        type: "object",
        properties: {
          name: { type: "string" },
          birthday: { type: "string" },
        },
        required: ["name", "birthday"],
        additionalProperties: false,
      })

      const Cat = jsonSilk({
        title: "Cat",
        type: "object",
        properties: {
          name: { type: "string" },
          birthday: { type: "string" },
          friend: Dog,
        },
        required: ["name", "birthday"],
        additionalProperties: false,
      })

      const r1 = resolver.of(Dog, {
        dog: query(silk.nullable(Dog), () => ({
          name: "",
          birthday: "2012-12-12",
        })),
        cat: query(Cat, () => ({
          name: "",
          birthday: "2012-12-12",
        })),
        dogs: query(silk.list(silk.nullable(Dog)), () => [
          { name: "Fido", birthday: "2012-12-12" },
          { name: "Rover", birthday: "2012-12-12" },
        ]),
        mustDog: query(Dog, () => ({
          name: "",
          birthday: "2012-12-12",
        })),
        mustDogs: query(silk.list(Dog), () => []),
        age: field(jsonSilk({ type: "number" })).resolve((dog) => {
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
          dog: Dog
          cat: Cat!
          dogs: [Dog]!
          mustDog: Dog!
          mustDogs: [Dog!]!
        }

        type Cat {
          name: String!
          birthday: String!
          friend: Dog
        }"
      `)
    })
  })
})

function printJSONSchema(schema: Parameters<typeof getGraphQLType>[0]): string {
  let gqlType = getGraphQLType(schema)
  while ("ofType" in gqlType) gqlType = gqlType.ofType
  return printType(gqlType as GraphQLNamedType)
}

function printResolver(...resolvers: Loom.Resolver[]): string {
  const schema = weave(...resolvers)
  return printSchema(schema)
}
