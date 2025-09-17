import {
  type GraphQLSilk,
  type SchemaWeaver,
  initWeaverContext,
  provideWeaverContext,
  silk,
} from "@gqloom/core"
import * as JSONSchema from "effect/JSONSchema"
import * as Schema from "effect/Schema"
import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLList,
  type GraphQLNamedType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
  printType,
} from "graphql"
import { describe, expect, it } from "vitest"
import { JSONWeaver } from "../src"

describe("effect/Schema", () => {
  it("should handle scalar", () => {
    expect(getGraphQLType(Schema.standardSchemaV1(Schema.String))).toEqual(
      new GraphQLNonNull(GraphQLString)
    )

    expect(
      getGraphQLType(Schema.standardSchemaV1(Schema.NullOr(Schema.String)))
    ).toEqual(GraphQLString)

    expect(getGraphQLType(Schema.standardSchemaV1(Schema.Number))).toEqual(
      new GraphQLNonNull(GraphQLFloat)
    )

    expect(getGraphQLType(Schema.standardSchemaV1(Schema.Boolean))).toEqual(
      new GraphQLNonNull(GraphQLBoolean)
    )
  })

  it("should handle array", () => {
    expect(
      getGraphQLType(Schema.standardSchemaV1(Schema.Array(Schema.String)))
    ).toEqual(
      new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString)))
    )

    expect(
      getGraphQLType(
        Schema.standardSchemaV1(Schema.Array(Schema.NullOr(Schema.String)))
      )
    ).toEqual(new GraphQLNonNull(new GraphQLList(GraphQLString)))

    expect(
      getGraphQLType(
        Schema.standardSchemaV1(Schema.NullOr(Schema.Array(Schema.String)))
      )
    )
  })

  it("should handle object", () => {
    const Cat = Schema.standardSchemaV1(
      Schema.Struct({
        __typename: Schema.tag("Cat"),
        name: Schema.String,
        age: Schema.Number,
        loveFish: Schema.NullOr(Schema.Boolean),
      })
    )

    const gqlType = getGraphQLType(Cat)
    expect(gqlType).toBeInstanceOf(GraphQLNonNull)
    expect((gqlType as GraphQLNonNull<any>).ofType).toBeInstanceOf(
      GraphQLObjectType
    )

    expect(printEffectSchema(Cat)).toMatchInlineSnapshot(`
      "type Cat {
        name: String!
        age: Float!
        loveFish: Boolean!
      }"
    `)
  })

  it.todo("should avoid duplicate object")

  it.todo("should handle enum")

  it.todo("should handle union as GraphQLUnionType")

  describe.todo("should handle input types", () => {
    it.todo("should convert object schema to input type for mutations")

    it.todo("should handle nested input objects")

    it.todo("should handle array inputs")

    it.todo("should avoid duplicate input types")
  })
})

const effectWeaver: SchemaWeaver = {
  vendor: "effect",
  getGraphQLType: (type: Schema.Schema<any, any, any>) =>
    JSONWeaver.getGraphQLType(JSONSchema.make(type), {
      source: type,
    }),
}

function getGraphQLType(type: GraphQLSilk) {
  const context = initWeaverContext()
  context.vendorWeavers.set(effectWeaver.vendor, effectWeaver)
  return provideWeaverContext(() => silk.getType(type), context)
}

function printEffectSchema(type: GraphQLSilk) {
  let gqlType = getGraphQLType(type)
  while ("ofType" in gqlType) gqlType = gqlType.ofType
  return printType(gqlType as GraphQLNamedType)
}
