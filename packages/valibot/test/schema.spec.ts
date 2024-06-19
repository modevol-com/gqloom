import { describe, expect, it } from "vitest"
import { valibotSilk } from "../src"
import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  type GraphQLObjectType,
  GraphQLScalarType,
  GraphQLString,
  GraphQLNonNull,
} from "graphql"
import * as v from "valibot"
import { type GQLoomExtensions, getGraphQLType } from "@gqloom/core"
import { asField } from "../src/metadata"

declare module "graphql" {
  export interface GraphQLObjectTypeExtensions extends GQLoomExtensions {}

  export interface GraphQLFieldExtensions<_TSource, _TContext, _TArgs = any>
    extends GQLoomExtensions {}
}

const GraphQLDate = new GraphQLScalarType<Date, string>({
  name: "Date",
})

describe("valibot", () => {
  it("should handle scalar", () => {
    expect(getGraphQLType(valibotSilk(v.nullable(v.string())))).toEqual(
      GraphQLString
    )
    expect(getGraphQLType(valibotSilk(v.nullable(v.boolean())))).toEqual(
      GraphQLBoolean
    )
    expect(getGraphQLType(valibotSilk(v.nullable(v.number())))).toEqual(
      GraphQLFloat
    )
    expect(
      getGraphQLType(valibotSilk(v.pipe(v.nullable(v.number()), v.integer())))
    ).toEqual(GraphQLInt)

    expect(
      getGraphQLType(valibotSilk(v.pipe(v.optional(v.string()), v.ulid())))
    ).toEqual(GraphQLID)
    expect(
      getGraphQLType(valibotSilk(v.pipe(v.optional(v.string()), v.uuid())))
    ).toEqual(GraphQLID)
    expect(
      getGraphQLType(valibotSilk(v.pipe(v.optional(v.string()), v.cuid2())))
    ).toEqual(GraphQLID)
    expect(
      getGraphQLType(valibotSilk(v.pipe(v.optional(v.string()), v.email())))
    ).toEqual(GraphQLString)
  })

  it.skip("should keep default value in extensions", () => {
    const objectType = v.object({
      foo: v.optional(v.string(), "foo"),
    })

    const objectGqlType = getGraphQLType(
      valibotSilk(objectType)
    ) as GraphQLObjectType

    const extensions = objectGqlType.getFields().foo.extensions

    expect(extensions.gqloom?.defaultValue).toEqual(expect.any(Function))
    expect(extensions.gqloom?.defaultValue?.()).toEqual("foo")
  })

  it("should handle custom type", () => {
    expect(
      getGraphQLType(
        valibotSilk(
          v.pipe(v.nullable(v.date()), asField({ type: GraphQLDate }))
        )
      )
    ).toEqual(GraphQLDate)
  })

  it("should handle non null", () => {
    expect(getGraphQLType(valibotSilk(v.string()))).toEqual(
      new GraphQLNonNull(GraphQLString)
    )
    expect(getGraphQLType(valibotSilk(v.nonNullable(v.string())))).toEqual(
      new GraphQLNonNull(GraphQLString)
    )
    expect(getGraphQLType(valibotSilk(v.nonOptional(v.string())))).toEqual(
      new GraphQLNonNull(GraphQLString)
    )
    expect(getGraphQLType(valibotSilk(v.nonNullish(v.string())))).toEqual(
      new GraphQLNonNull(GraphQLString)
    )

    expect(getGraphQLType(valibotSilk(v.nullable(v.string())))).toEqual(
      GraphQLString
    )
    expect(getGraphQLType(valibotSilk(v.optional(v.string())))).toEqual(
      GraphQLString
    )
    expect(getGraphQLType(valibotSilk(v.nullish(v.string())))).toEqual(
      GraphQLString
    )
  })
})
