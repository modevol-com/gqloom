import {
  GraphQLInt,
  GraphQLObjectType,
  GraphQLString,
  isInputObjectType,
  printType,
} from "graphql"
import { describe, expect, it } from "vitest"
import { toInputObjectType } from "./utils"
import type { InputMap } from "./types"

describe("toInputObjectType", () => {
  it("should convert ObjectType to InputObjectType", () => {
    const Dog = new GraphQLObjectType({
      name: "Dog",
      fields: {
        name: { type: GraphQLString },
        age: { type: GraphQLInt },
      },
    })
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
    const Dog = new GraphQLObjectType({
      name: "Dog",
      fields: {
        name: { type: GraphQLString },
        age: { type: GraphQLInt },
      },
    })
    const map: InputMap = new Map()
    expect(toInputObjectType(Dog, map)).toBe(toInputObjectType(Dog, map))
  })

  it("should throw if InputObjectType already exists", () => {
    const Dog = new GraphQLObjectType({
      name: "Dog",
      fields: {
        name: { type: GraphQLString },
        age: { type: GraphQLInt },
      },
    })
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
