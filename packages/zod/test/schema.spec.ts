import { describe, expect, it } from "vitest"
import { zodSilk } from "../src"
import { z } from "zod"
import {
  GraphQLID,
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLNonNull,
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
  it.todo("should handle array")
  it.todo("should handle object")
  it.todo("should handle enum")
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
