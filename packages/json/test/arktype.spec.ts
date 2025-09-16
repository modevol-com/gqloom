import {
  type GraphQLSilk,
  type SchemaWeaver,
  initWeaverContext,
  provideWeaverContext,
  silk,
} from "@gqloom/core"
import { type Type, type } from "arktype"
import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLString,
} from "graphql"
import { describe, expect, it } from "vitest"
import { type JSONSchema, JSONWeaver } from "../src"

describe("arktype", () => {
  it("should handle scalar", () => {
    expect(getGraphQLType(type("string"))).toEqual(
      new GraphQLNonNull(GraphQLString)
    )

    expect(getGraphQLType(type("string | null"))).toEqual(GraphQLString)

    expect(getGraphQLType(type("number"))).toEqual(
      new GraphQLNonNull(GraphQLFloat)
    )
    expect(getGraphQLType(type("number.integer"))).toEqual(
      new GraphQLNonNull(GraphQLInt)
    )

    expect(getGraphQLType(type("boolean"))).toEqual(
      new GraphQLNonNull(GraphQLBoolean)
    )
  })
})

const arktypeWeaver: SchemaWeaver = {
  vendor: "arktype",
  getGraphQLType: (type: Type) =>
    JSONWeaver.getGraphQLType(type.toJsonSchema() as JSONSchema),
}

function getGraphQLType(type: GraphQLSilk) {
  const context = initWeaverContext()
  context.vendorWeavers.set(arktypeWeaver.vendor, arktypeWeaver)
  return provideWeaverContext(() => silk.getType(type), context)
}
