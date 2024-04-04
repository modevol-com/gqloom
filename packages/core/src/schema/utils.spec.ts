import type { GraphQLInputObjectType } from "graphql"
import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLObjectType,
  GraphQLString,
  isInputObjectType,
  printType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLInterfaceType,
  GraphQLUnionType,
} from "graphql"
import { describe, expect, it } from "vitest"
import { ensureInputType, toInputObjectType } from "./utils"
import type { InputMap } from "./types"

describe("toInputObjectType", () => {
  const Dog = new GraphQLObjectType({
    name: "Dog",
    fields: {
      name: { type: GraphQLString },
      age: { type: GraphQLInt },
    },
  })
  it("should convert ObjectType to InputObjectType", () => {
    const DogInput = toInputObjectType(Dog)
    expect(isInputObjectType(DogInput)).toBe(true)
    expect(printType(DogInput)).toMatchInlineSnapshot(`
      "input Dog {
        name: String
        age: Int
      }"
    `)
  })

  it("should return same InputObjectType for same ObjectType", () => {
    const map: InputMap = new Map()
    expect(toInputObjectType(Dog, map)).toBe(toInputObjectType(Dog, map))
  })

  it("should throw if InputObjectType already exists", () => {
    const Dog1 = new GraphQLObjectType({
      name: "Dog",
      fields: {
        name: { type: GraphQLString },
        age: { type: GraphQLInt },
      },
    })
    const map: InputMap = new Map()
    expect(() => {
      toInputObjectType(Dog, map)
      toInputObjectType(Dog1, map)
    }).toThrow("Input Type Dog already exists")
  })
})

describe("ensureInputType", () => {
  it("should ensure ScalarType", () => {
    expect(ensureInputType(GraphQLString)).toBe(GraphQLString)
    expect(ensureInputType(GraphQLInt)).toBe(GraphQLInt)
    expect(ensureInputType(GraphQLFloat)).toBe(GraphQLFloat)
    expect(ensureInputType(GraphQLBoolean)).toBe(GraphQLBoolean)
    expect(ensureInputType(GraphQLID)).toBe(GraphQLID)
  })

  it("should ensure List", () => {
    expect(ensureInputType(new GraphQLList(GraphQLString))).toEqual(
      new GraphQLList(GraphQLString)
    )
    expect(ensureInputType(new GraphQLList(GraphQLInt))).toEqual(
      new GraphQLList(GraphQLInt)
    )
  })
  it("should ensure NonNull", () => {
    expect(ensureInputType(new GraphQLNonNull(GraphQLString))).toEqual(
      new GraphQLNonNull(GraphQLString)
    )
    expect(ensureInputType(new GraphQLNonNull(GraphQLInt))).toEqual(
      new GraphQLNonNull(GraphQLInt)
    )
  })
  it("should ensure Input Object", () => {
    const Dog = new GraphQLObjectType({
      name: "Dog",
      fields: {
        name: { type: GraphQLString },
        age: { type: GraphQLInt },
      },
    })
    expect(printType(ensureInputType(Dog) as GraphQLInputObjectType)).toEqual(
      printType(toInputObjectType(Dog))
    )
  })

  it("should prevent Interface Type", () => {
    expect(() => {
      ensureInputType(
        new GraphQLInterfaceType({
          name: "Dog",
          fields: {},
        })
      )
    }).toThrow("Cannot convert interface type Dog to input type")
  })

  it("should prevent Union Type", () => {
    expect(() => {
      ensureInputType(
        new GraphQLUnionType({
          name: "Dog",
          types: [],
        })
      )
    }).toThrow("Cannot convert union type Dog to input type")
  })
})
