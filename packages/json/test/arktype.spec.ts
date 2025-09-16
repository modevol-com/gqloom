import {
  type GraphQLSilk,
  type Loom,
  type SchemaWeaver,
  field,
  initWeaverContext,
  provideWeaverContext,
  query,
  resolver,
  silk,
  weave,
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
  printSchema,
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

  it("should avoid duplicate object", () => {
    const Dog = type({
      "__typename?": "'Dog'",
      name: "string",
      birthday: "string",
    })

    const Cat = type({
      "__typename?": "'Cat'",
      name: "string",
      birthday: "string",
    })

    const r1 = resolver.of(Dog, {
      dog: query(Dog, () => ({ name: "", birthday: "2012-12-12" })),
      cat: query(Cat, () => ({ name: "", birthday: "2012-12-12" })),
      dogs: query(silk.list(Dog), () => [
        { name: "", birthday: "2012-12-12" },
        { name: "", birthday: "2012-12-12" },
      ]),
      mustDog: query(Dog, () => ({ name: "", birthday: "2012-12-12" })),
      mustDogs: query(silk.list(Dog), () => []),
      age: field(type("number.integer"), (dog) => {
        return new Date().getFullYear() - new Date(dog.birthday).getFullYear()
      }),
    })

    expect(printResolver(r1)).toMatchInlineSnapshot(`
      "type Dog {
        birthday: String!
        name: String!
        age: Int!
      }

      type Query {
        dog: Dog!
        cat: Cat!
        dogs: [Dog!]!
        mustDog: Dog!
        mustDogs: [Dog!]!
      }

      type Cat {
        birthday: String!
        name: String!
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

function printResolver(...resolvers: Loom.Resolver[]): string {
  const schema = weave(arktypeWeaver, ...resolvers)
  return printSchema(schema)
}
