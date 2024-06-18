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

describe("valibot", () => {
  it("should handle scalar", () => {
    expect(valibotSilk(v.string()).getGraphQLType()).toEqual(GraphQLString)
    expect(valibotSilk(v.boolean()).getGraphQLType()).toEqual(GraphQLBoolean)
    expect(valibotSilk(v.number()).getGraphQLType()).toEqual(GraphQLFloat)
    expect(
      valibotSilk(v.pipe(v.number(), v.integer())).getGraphQLType()
    ).toEqual(GraphQLInt)

    expect(valibotSilk(v.pipe(v.string(), v.ulid())).getGraphQLType()).toEqual(
      GraphQLID
    )
    expect(valibotSilk(v.pipe(v.string(), v.uuid())).getGraphQLType()).toEqual(
      GraphQLID
    )
    expect(valibotSilk(v.pipe(v.string(), v.cuid2())).getGraphQLType()).toEqual(
      GraphQLID
    )
    expect(valibotSilk(v.pipe(v.string(), v.email())).getGraphQLType()).toEqual(
      GraphQLString
    )
  })
})
