import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
  GraphQLUnionType,
  isInputObjectType,
  printSchema,
  printType,
} from "graphql"
import { describe, expect, it } from "vitest"
import { mutation, resolver, silk } from "../resolver"
import { AUTO_ALIASING } from "../utils/constants"
import { ensureInputObjectType, ensureInputType, inputToArgs } from "./input"
import { weave } from "./schema-loom"
import { initWeaverContext, provideWeaverContext } from "./weaver-context"

const testOptions = { fieldName: "Test" }

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
    const DogInput = ensureInputObjectType(Dog, testOptions)
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
      expect(ensureInputObjectType(Dog, testOptions)).toBe(
        ensureInputObjectType(Dog, testOptions)
      )
    }, initWeaverContext())
  })
})

describe("ensureInputType", () => {
  it("should ensure Scalar Type", () => {
    expect(ensureInputType(GraphQLString, testOptions)).toBe(GraphQLString)
    expect(ensureInputType(GraphQLInt, testOptions)).toBe(GraphQLInt)
    expect(ensureInputType(GraphQLFloat, testOptions)).toBe(GraphQLFloat)
    expect(ensureInputType(GraphQLBoolean, testOptions)).toBe(GraphQLBoolean)
    expect(ensureInputType(GraphQLID, testOptions)).toBe(GraphQLID)
  })

  it("should ensure List", () => {
    expect(
      ensureInputType(new GraphQLList(GraphQLString), testOptions)
    ).toEqual(new GraphQLList(GraphQLString))
    expect(ensureInputType(new GraphQLList(GraphQLInt), testOptions)).toEqual(
      new GraphQLList(GraphQLInt)
    )
  })
  it("should ensure NonNull", () => {
    expect(
      ensureInputType(new GraphQLNonNull(GraphQLString), testOptions)
    ).toEqual(new GraphQLNonNull(GraphQLString))
    expect(
      ensureInputType(new GraphQLNonNull(GraphQLInt), testOptions)
    ).toEqual(new GraphQLNonNull(GraphQLInt))
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
    expect(
      printType(ensureInputType(Dog, testOptions) as GraphQLInputObjectType)
    ).toEqual(printType(DogInput))
    expect(ensureInputType(DogInput, testOptions)).toBe(DogInput)
  })

  it("should prevent Union Type", () => {
    expect(() => {
      ensureInputType(
        new GraphQLUnionType({
          name: "Dog",
          types: [],
        }),
        testOptions
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
      inputToArgs({ name: StringSilk, age: IntSilk }, testOptions)
    ).toMatchObject({
      name: { type: GraphQLString },
      age: { type: GraphQLInt },
    })
  })

  it("should convert ObjectType", () => {
    expect(inputToArgs(DogSilk, testOptions)).toMatchObject({
      name: { type: GraphQLString },
      age: { type: GraphQLInt },
    })
  })

  it("should convert nested ObjectType", () => {
    const input = { dog: DogSilk }
    const args = inputToArgs(input, testOptions)
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
    const hunterArgs = inputToArgs(HunterSilk, testOptions)
    expect(hunterArgs).toMatchObject({
      name: { type: GraphQLString },
      dog: { type: { name: "Dog" } },
    })
    expect(hunterArgs?.dog.type).toBeInstanceOf(GraphQLInputObjectType)
  })

  it("should accept undefined", () => {
    expect(inputToArgs(undefined, testOptions)).toBe(undefined)
  })

  it("should prevent ScalarType", () => {
    expect(() => inputToArgs(StringSilk, testOptions)).toThrow(
      "Cannot convert String to input type"
    )
    expect(() => inputToArgs(IntSilk, testOptions)).toThrow(
      "Cannot convert Int to input type"
    )
  })

  it("should auto assign alias for inputs", () => {
    const Foo = new GraphQLObjectType({
      name: AUTO_ALIASING,
      fields: () => ({
        baz: { type: Baz },
      }),
    })
    const Bar = new GraphQLObjectType({
      name: AUTO_ALIASING,
      fields: {
        hello: { type: GraphQLString },
        foo: { type: Foo },
      },
    })
    const Baz = new GraphQLObjectType({
      name: "Baz",
      fields: {
        bar: { type: GraphQLString },
      },
    })

    const r = resolver({
      addBar: mutation(silk(GraphQLString), {
        input: { value: silk(Bar) },
        resolve: () => "hello",
      }),
    })

    const schema = weave(r)

    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type Mutation {
        addBar(value: AddBarValueInput): String
      }

      input AddBarValueInput {
        hello: String
        foo: AddBarValueFooInput
      }

      input AddBarValueFooInput {
        baz: Baz
      }

      input Baz {
        bar: String
      }"
    `)
  })
})
