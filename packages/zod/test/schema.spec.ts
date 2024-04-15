import { describe, expect, it } from "vitest"
import { zodSilk } from "../src"
import { z } from "zod"
import {
  GraphQLID,
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
} from "graphql"

describe("ZodSilk", () => {
  it("should handle scalar", () => {
    expect(zodSilk(z.string()).getType()).toEqual(GraphQLString)
    expect(zodSilk(z.number()).getType()).toEqual(GraphQLFloat)
    expect(zodSilk(z.number().int()).getType()).toEqual(GraphQLInt)
    expect(zodSilk(z.boolean()).getType()).toEqual(GraphQLBoolean)
    expect(zodSilk(z.date()).getType()).toEqual(GraphQLString)

    expect(zodSilk(z.string().cuid()).getType()).toEqual(GraphQLID)
    expect(zodSilk(z.string().cuid2()).getType()).toEqual(GraphQLID)
    expect(zodSilk(z.string().ulid()).getType()).toEqual(GraphQLID)
    expect(zodSilk(z.string().uuid()).getType()).toEqual(GraphQLID)

    expect(zodSilk(z.string().email()).getType()).toEqual(GraphQLString)
  })
  it.todo("should handle non null")
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
