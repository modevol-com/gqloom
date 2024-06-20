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
  GraphQLList,
} from "graphql"
import {
  type GQLoomExtensions,
  getGraphQLType,
  collectNames,
} from "@gqloom/core"
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
  array,
  picklist,
  enum_,
} from "valibot"
import { type PipedSchema } from "../src/types"

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
    let schema: PipedSchema
    schema = nullable(string())
    expect(getGraphQLType(valibotSilk(schema))).toEqual(GraphQLString)

    schema = nullable(boolean())
    expect(getGraphQLType(valibotSilk(schema))).toEqual(GraphQLBoolean)
    schema = nullable(number())

    expect(getGraphQLType(valibotSilk(schema))).toEqual(GraphQLFloat)

    schema = pipe(nullable(number()), integer())
    expect(getGraphQLType(valibotSilk(schema))).toEqual(GraphQLInt)

    schema = pipe(optional(string()), ulid())
    expect(getGraphQLType(valibotSilk(schema))).toEqual(GraphQLID)

    schema = pipe(optional(string()), uuid())
    expect(getGraphQLType(valibotSilk(schema))).toEqual(GraphQLID)

    schema = pipe(optional(string()), cuid2())
    expect(getGraphQLType(valibotSilk(schema))).toEqual(GraphQLID)

    schema = pipe(optional(string()), email())
    expect(getGraphQLType(valibotSilk(schema))).toEqual(GraphQLString)
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
  it("should handle array", () => {
    expect(getGraphQLType(valibotSilk(array(string())))).toEqual(
      new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString)))
    )

    expect(getGraphQLType(valibotSilk(optional(array(string()))))).toEqual(
      new GraphQLList(new GraphQLNonNull(GraphQLString))
    )

    expect(getGraphQLType(valibotSilk(array(nullable(string()))))).toEqual(
      new GraphQLNonNull(new GraphQLList(GraphQLString))
    )

    expect(
      getGraphQLType(valibotSilk(nullable(array(nullable(string())))))
    ).toEqual(new GraphQLList(GraphQLString))
  })

  it("should handle object", () => {
    const Cat1 = pipe(
      object({
        name: string(),
        age: pipe(number(), integer()),
        loveFish: optional(boolean()),
      }),
      asObjectType({ name: "Cat" })
    )

    const Cat = object({
      name: string(),
      age: pipe(number(), integer()),
      loveFish: optional(boolean()),
    })

    collectNames({ Cat })

    expect(printValibotSilk(Cat)).toEqual(printValibotSilk(Cat1))
    expect(
      (getGraphQLType(valibotSilk(Cat)) as GraphQLNonNull<any>).ofType
    ).toBeInstanceOf(GraphQLObjectType)

    expect(printValibotSilk(Cat)).toMatchInlineSnapshot(`
      "type Cat {
        name: String!
        age: Int!
        loveFish: Boolean
      }"
    `)
  })

  it("should handle enum", () => {
    const FruitPL = picklist(["apple", "banana", "orange"])
    enum Fruit {
      apple,
      banana,
      orange,
    }
    const FruitE = enum_(Fruit)

    collectNames({ Fruit: FruitPL }, { Fruit: FruitE })
    expect(printValibotSilk(FruitPL)).toEqual(printValibotSilk(FruitE))
    expect(printValibotSilk(FruitPL)).toMatchInlineSnapshot(`
      "enum Fruit {
        apple
        banana
        orange
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
