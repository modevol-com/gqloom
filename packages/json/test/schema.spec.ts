import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  type GraphQLNamedType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
  printType,
} from "graphql"
import { describe, expect, it } from "vitest"
import { JSONWeaver } from "../src"

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
})

function printJSONSchema(schema: Parameters<typeof getGraphQLType>[0]): string {
  let gqlType = getGraphQLType(schema)
  while ("ofType" in gqlType) gqlType = gqlType.ofType
  return printType(gqlType as GraphQLNamedType)
}
