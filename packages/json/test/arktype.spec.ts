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
  GraphQLList,
  type GraphQLNamedType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
  printType,
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

  it("should handle array", () => {
    expect(getGraphQLType(type("string[]"))).toEqual(
      new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString)))
    )

    expect(getGraphQLType(type("(string|null)[]"))).toEqual(
      new GraphQLNonNull(new GraphQLList(GraphQLString))
    )

    expect(getGraphQLType(type("string[] | null"))).toEqual(
      new GraphQLList(new GraphQLNonNull(GraphQLString))
    )
  })

  it("should handle object", () => {
    const Cat = type({
      "__typename?": "'Cat'",
      name: "string",
      age: "number",
      "loveFish?": "boolean",
    })

    const gqlType = getGraphQLType(Cat)
    expect(gqlType).toBeInstanceOf(GraphQLNonNull)
    expect((gqlType as GraphQLNonNull<any>).ofType).toBeInstanceOf(
      GraphQLObjectType
    )

    expect(printArktypeSchema(Cat)).toMatchInlineSnapshot(`
      "type Cat {
        age: Float!
        name: String!
        loveFish: Boolean
      }"
    `)
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

function printArktypeSchema(type: Type) {
  let gqlType = getGraphQLType(type)
  while ("ofType" in gqlType) gqlType = gqlType.ofType
  return printType(gqlType as GraphQLNamedType)
}
