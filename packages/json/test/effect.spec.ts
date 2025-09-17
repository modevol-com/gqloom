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
  GraphQLNonNull,
  GraphQLString,
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

  it.todo("should handle array")

  it.todo("should handle object")

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
