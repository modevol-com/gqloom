import { GraphQLInputObjectType } from "graphql"
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
  GraphQLUnionType,
} from "graphql"
import { describe, expect, it } from "vitest"
import { ensureInputType, inputToArgs, ensureInputObjectType } from "./input"
import { silk } from "../resolver"
import { initWeaverContext, provideWeaverContext } from "./weaver-context"

describe("toInputObjectType", () => {
  const Dog: GraphQLObjectType = new GraphQLObjectType({
    name: "Dog",
    fields: () => ({
      name: { type: GraphQLString },
      age: { type: GraphQLInt },
      parent: { type: Dog },
    }),
  })
  it("should convert ObjectType to InputObjectType", () => {
    const DogInput = ensureInputObjectType(Dog)
    expect(isInputObjectType(DogInput)).toBe(true)
    expect(printType(DogInput)).toMatchInlineSnapshot(`
      "input Dog {
        name: String
        age: Int
        parent: Dog
      }"
    `)
  })

  it("should return same InputObjectType for same ObjectType", () => {
    provideWeaverContext(() => {
      expect(ensureInputObjectType(Dog)).toBe(ensureInputObjectType(Dog))
    }, initWeaverContext())
  })
})

describe("ensureInputType", () => {
  it("should ensure Scalar Type", () => {
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
    const DogInput = new GraphQLInputObjectType({
      name: "Dog",
      fields: {
        name: { type: GraphQLString },
        age: { type: GraphQLInt },
      },
    })
    expect(printType(ensureInputType(Dog) as GraphQLInputObjectType)).toEqual(
      printType(DogInput)
    )
    expect(ensureInputType(DogInput)).toBe(DogInput)
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

describe("inputToArgs", () => {
  interface IDog {
    name: string
    age: number
  }

  const Dog = new GraphQLObjectType({
    name: "Dog",
    fields: {
      name: { type: GraphQLString },
      age: { type: GraphQLInt },
    },
  })

  const DogSilk = silk<IDog, IDog>(Dog)
  const StringSilk = silk<string, string>(GraphQLString)
  const IntSilk = silk<number, number>(GraphQLInt)

  it("should convert record", () => {
    expect(
      inputToArgs({
        name: StringSilk,
        age: IntSilk,
      })
    ).toMatchObject({
      name: { type: GraphQLString },
      age: { type: GraphQLInt },
    })
  })

  it("should convert ObjectType", () => {
    expect(inputToArgs(DogSilk)).toMatchObject({
      name: { type: GraphQLString },
      age: { type: GraphQLInt },
    })
  })

  it("should convert nested ObjectType", () => {
    const input = { dog: DogSilk }
    const args = inputToArgs(input)
    expect(args).toMatchObject({
      dog: { type: { name: "Dog" } },
    })
    expect(args?.dog.type).toBeInstanceOf(GraphQLInputObjectType)

    const Hunter = new GraphQLObjectType({
      name: "Hunter",
      fields: {
        name: { type: GraphQLString },
        dog: { type: Dog },
      },
    })
    interface IHunter {
      name: string
      dog: IDog
    }
    const HunterSilk = silk<IHunter, IHunter>(Hunter)
    const hunterArgs = inputToArgs(HunterSilk)
    expect(hunterArgs).toMatchObject({
      name: { type: GraphQLString },
      dog: { type: { name: "Dog" } },
    })
    expect(hunterArgs?.dog.type).toBeInstanceOf(GraphQLInputObjectType)
  })

  it("should accept undefined", () => {
    expect(inputToArgs(undefined)).toBe(undefined)
  })

  it("should prevent ScalarType", () => {
    expect(() => inputToArgs(StringSilk)).toThrow(
      "Cannot convert String to input type"
    )
    expect(() => inputToArgs(IntSilk)).toThrow(
      "Cannot convert Int to input type"
    )
  })
})
