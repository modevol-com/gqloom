import { describe, expect, it } from "vitest"
import { zodSilk } from "../src"
import { type Schema, z } from "zod"
import {
  GraphQLID,
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLNonNull,
  GraphQLList,
  GraphQLObjectType,
  printType,
  type GraphQLNamedType,
} from "graphql"

describe("ZodSilk", () => {
  it("should handle scalar", () => {
    expect(zodSilk(z.string().nullable()).getType()).toEqual(GraphQLString)
    expect(zodSilk(z.number().nullable()).getType()).toEqual(GraphQLFloat)
    expect(zodSilk(z.number().int().nullable()).getType()).toEqual(GraphQLInt)
    expect(zodSilk(z.boolean().nullable()).getType()).toEqual(GraphQLBoolean)
    expect(zodSilk(z.date().nullable()).getType()).toEqual(GraphQLString)

    expect(zodSilk(z.string().cuid().nullable()).getType()).toEqual(GraphQLID)
    expect(zodSilk(z.string().cuid2().nullable()).getType()).toEqual(GraphQLID)
    expect(zodSilk(z.string().ulid().nullable()).getType()).toEqual(GraphQLID)
    expect(zodSilk(z.string().uuid().nullable()).getType()).toEqual(GraphQLID)

    expect(zodSilk(z.string().email().nullable()).getType()).toEqual(
      GraphQLString
    )
  })
  it("should handle non null", () => {
    expect(zodSilk(z.string()).getType()).toEqual(
      new GraphQLNonNull(GraphQLString)
    )
    expect(zodSilk(z.string().nullable()).getType()).toEqual(GraphQLString)
    expect(zodSilk(z.string().optional()).getType()).toEqual(GraphQLString)
    expect(zodSilk(z.string().nullish()).getType()).toEqual(GraphQLString)
  })
  it("should handle array", () => {
    expect(zodSilk(z.array(z.string())).getType()).toEqual(
      new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString)))
    )
    expect(zodSilk(z.string().array()).getType()).toEqual(
      new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString)))
    )

    expect(zodSilk(z.array(z.string()).optional()).getType()).toEqual(
      new GraphQLList(new GraphQLNonNull(GraphQLString))
    )

    expect(zodSilk(z.array(z.string().nullable())).getType()).toEqual(
      new GraphQLNonNull(new GraphQLList(GraphQLString))
    )

    expect(
      zodSilk(z.array(z.string().nullable()).nullable()).getType()
    ).toEqual(new GraphQLList(GraphQLString))
  })
  it("should handle object", () => {
    const Cat = z
      .object({
        name: z.string(),
        age: z.number(),
        loveFish: z.boolean().optional(),
      })
      .describe("Cat")

    expect(
      (zodSilk(Cat).getType() as GraphQLNonNull<any>).ofType
    ).toBeInstanceOf(GraphQLObjectType)

    expect(printZodSilk(Cat)).toMatchInlineSnapshot(`
      "type Cat {
        name: String!
        age: Float!
        loveFish: Boolean
      }"
    `)
  })

  it("should handle enum", () => {
    const fruitZ = z
      .enum(["apple", "banana", "orange"])
      .describe("Fruit: Some fruits you might like")
    enum Fruit {
      apple,
      banana,
      orange,
    }
    const fruitN = z
      .nativeEnum(Fruit)
      .describe("Fruit: Some fruits you might like")

    expect(printZodSilk(fruitN)).toEqual(printZodSilk(fruitZ))

    expect(printZodSilk(fruitZ)).toMatchInlineSnapshot(`
      """"Some fruits you might like"""
      enum Fruit {
        apple
        banana
        orange
      }"
    `)
  })
  it.todo("should handle interfere")
  it.todo("should handle union")
  describe.todo("should avoid duplicate", () => {
    it.todo("should merge field from multiple resolver")
    it.todo("should avoid duplicate object")
    it.todo("should avoid duplicate input")
    it.todo("should avoid duplicate enum")
    it.todo("should avoid duplicate interface")
    it.todo("should avoid duplicate union")
  })
})

function printZodSilk(schema: Schema): string {
  let gqlType = zodSilk(schema).getType()
  while ("ofType" in gqlType) gqlType = gqlType.ofType
  return printType(gqlType as GraphQLNamedType)
}
