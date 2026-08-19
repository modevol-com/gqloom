import { GraphQLList, GraphQLNonNull, GraphQLString } from "graphql"
import { describe, expect, it } from "vitest"
import { unwrapType } from "./type"

describe("unwrapType", () => {
  it("should unwrap a unwrapped type", () => {
    const type = unwrapType(GraphQLString)
    expect(type).toBe(GraphQLString)
  })

  it("should unwrap a non-null type", () => {
    const type = unwrapType(new GraphQLNonNull(GraphQLString))
    expect(type).toBe(GraphQLString)
  })

  it("should unwrap a list type", () => {
    const type = unwrapType(new GraphQLList(GraphQLString))
    expect(type).toBe(GraphQLString)
  })

  it("should unwrap a non-null list type", () => {
    const type = unwrapType(
      new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString)))
    )
    expect(type).toBe(GraphQLString)
  })
})
