import { describe, expect, it } from "vitest"
import { ensureInterfaceType } from "./interface"
import {
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLString,
  printType,
} from "graphql"
import { initWeaverContext, provideWeaverContext } from "./weaver-context"

describe("ensureInterfaceType", () => {
  it("should handle interface type", () => {
    const interfaceType = new GraphQLInterfaceType({
      name: "Dog",
      fields: { name: { type: GraphQLString } },
    })
    const result = ensureInterfaceType(interfaceType)
    expect(result).toBe(interfaceType)
    expect(printType(result)).toMatchInlineSnapshot(`
      "interface Dog {
        name: String
      }"
    `)
  })

  it("should handle object type", () => {
    const objectType = new GraphQLObjectType({
      name: "Dog",
      fields: { name: { type: GraphQLString } },
    })
    const result = ensureInterfaceType(objectType)
    expect(result).toBeInstanceOf(GraphQLInterfaceType)
    expect(printType(result)).toMatchInlineSnapshot(`
      "interface Dog {
        name: String
      }"
    `)
  })

  it("should return same object for same input ", () => {
    const objectType = new GraphQLObjectType({
      name: "Dog",
      fields: { name: { type: GraphQLString } },
    })
    provideWeaverContext(() => {
      const result = ensureInterfaceType(objectType)
      expect(result).toBe(ensureInterfaceType(objectType))
    }, initWeaverContext())
  })
})
