import { describe, expect, it } from "vitest"
import { valibotSilk } from "../src"
import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLString,
} from "graphql"
import * as v from "valibot"
import { getGraphQLType } from "@gqloom/core"

describe("valibot", () => {
  it("should handle scalar", () => {
    expect(getGraphQLType(valibotSilk(v.string()))).toEqual(GraphQLString)
    expect(getGraphQLType(valibotSilk(v.boolean()))).toEqual(GraphQLBoolean)
    expect(getGraphQLType(valibotSilk(v.number()))).toEqual(GraphQLFloat)
    expect(
      getGraphQLType(valibotSilk(v.pipe(v.number(), v.integer())))
    ).toEqual(GraphQLInt)

    expect(getGraphQLType(valibotSilk(v.pipe(v.string(), v.ulid())))).toEqual(
      GraphQLID
    )
    expect(getGraphQLType(valibotSilk(v.pipe(v.string(), v.uuid())))).toEqual(
      GraphQLID
    )
    expect(getGraphQLType(valibotSilk(v.pipe(v.string(), v.cuid2())))).toEqual(
      GraphQLID
    )
    expect(getGraphQLType(valibotSilk(v.pipe(v.string(), v.email())))).toEqual(
      GraphQLString
    )
  })
})
