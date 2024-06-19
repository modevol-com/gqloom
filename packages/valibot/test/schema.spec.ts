import { describe, expect, it } from "vitest"
import { valibotSilk } from "../src"
import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLString,
  GraphQLNonNull,
  type GraphQLNamedType,
  printType,
} from "graphql"
import { type GQLoomExtensions, getGraphQLType } from "@gqloom/core"
import { asField, asObjectType } from "../src/metadata"
import {
  type BaseSchema,
  type BaseSchemaAsync,
  boolean,
  cuid2,
  date,
  email,
  integer,
  nonNullable,
  nonNullish,
  nonOptional,
  nullable,
  nullish,
  number,
  object,
  optional,
  pipe,
  string,
  ulid,
  uuid,
} from "valibot"

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
    expect(getGraphQLType(valibotSilk(nullable(string())))).toEqual(
      GraphQLString
    )
    expect(getGraphQLType(valibotSilk(nullable(boolean())))).toEqual(
      GraphQLBoolean
    )
    expect(getGraphQLType(valibotSilk(nullable(number())))).toEqual(
      GraphQLFloat
    )
    expect(
      getGraphQLType(valibotSilk(pipe(nullable(number()), integer())))
    ).toEqual(GraphQLInt)

    expect(
      getGraphQLType(valibotSilk(pipe(optional(string()), ulid())))
    ).toEqual(GraphQLID)
    expect(
      getGraphQLType(valibotSilk(pipe(optional(string()), uuid())))
    ).toEqual(GraphQLID)
    expect(
      getGraphQLType(valibotSilk(pipe(optional(string()), cuid2())))
    ).toEqual(GraphQLID)
    expect(
      getGraphQLType(valibotSilk(pipe(optional(string()), email())))
    ).toEqual(GraphQLString)
  })

  it("should keep default value in extensions", () => {
    const objectType = pipe(
      object({
        foo: optional(string(), () => "foo"),
      }),
      asObjectType({ name: "ObjectType" })
    )

    const objectGqlType = (
      getGraphQLType(
        valibotSilk(objectType)
      ) as GraphQLNonNull<GraphQLObjectType>
    ).ofType

    const extensions = objectGqlType.getFields().foo.extensions

    expect(extensions?.defaultValue).toEqual(expect.any(Function))
    expect(extensions?.defaultValue?.()).toEqual("foo")
  })

  it("should handle custom type", () => {
    expect(
      getGraphQLType(
        valibotSilk(pipe(nullable(date()), asField({ type: GraphQLDate })))
      )
    ).toEqual(GraphQLDate)
  })

  it("should handle non null", () => {
    expect(getGraphQLType(valibotSilk(string()))).toEqual(
      new GraphQLNonNull(GraphQLString)
    )
    expect(getGraphQLType(valibotSilk(nonNullable(string())))).toEqual(
      new GraphQLNonNull(GraphQLString)
    )
    expect(getGraphQLType(valibotSilk(nonOptional(string())))).toEqual(
      new GraphQLNonNull(GraphQLString)
    )
    expect(getGraphQLType(valibotSilk(nonNullish(string())))).toEqual(
      new GraphQLNonNull(GraphQLString)
    )

    expect(getGraphQLType(valibotSilk(nullable(string())))).toEqual(
      GraphQLString
    )
    expect(getGraphQLType(valibotSilk(optional(string())))).toEqual(
      GraphQLString
    )
    expect(getGraphQLType(valibotSilk(nullish(string())))).toEqual(
      GraphQLString
    )
  })

  it("should handle object", () => {
    const Cat = pipe(
      object({
        name: string(),
        age: pipe(number(), integer()),
        loveFish: optional(boolean()),
      }),
      asObjectType({ name: "Cat" })
    )

    expect(
      (getGraphQLType(valibotSilk(Cat)) as GraphQLNonNull<any>).ofType
    ).toBeInstanceOf(GraphQLObjectType)

    expect(printValibotSilk(Cat)).toMatchInlineSnapshot(`
      "type Cat {
        name: String!
        age: Float!
        loveFish: Boolean
      }"
    `)
  })
})

function printValibotSilk(
  schema: BaseSchema<any, any, any> | BaseSchemaAsync<any, any, any>
): string {
  let gqlType = getGraphQLType(valibotSilk(schema))
  while ("ofType" in gqlType) gqlType = gqlType.ofType
  return printType(gqlType as GraphQLNamedType)
}
