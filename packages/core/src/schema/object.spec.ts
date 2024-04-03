import {
  GraphQLInt,
  GraphQLObjectType,
  GraphQLString,
  printType,
} from "graphql"
import { describe, expect, it } from "vitest"
import { ModifiableObjectType } from "./object"
import { silk, silkField } from "../resolver"

describe("printType", () => {
  it("should print type correctly", () => {
    const Dog = new GraphQLObjectType({
      name: "Dog",
      fields: {
        name: { type: GraphQLString },
        age: { type: GraphQLInt },
      },
    })

    expect(printType(Dog)).toMatchInlineSnapshot(`
      "type Dog {
        name: String
        age: Int
      }"
    `)
  })
})

describe("ModifiableObjectType", () => {
  it("should weave object with Extra fields correctly", () => {
    const Dog = new ModifiableObjectType({ name: "Dog", fields: {} })
    Dog.addField(
      "name",
      silkField(silk<string, string>(GraphQLString), () => "")
    )
    Dog.addField(
      "age",
      silkField(silk<number, number>(GraphQLInt), () => 0)
    )
    expect(printType(Dog)).toMatchInlineSnapshot(`
      "type Dog {
        name: String
        age: Int
      }"
    `)
  })
})
