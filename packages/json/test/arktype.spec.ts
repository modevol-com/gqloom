import {
  collectNames,
  field,
  type GraphQLSilk,
  initWeaverContext,
  type Loom,
  provideWeaverContext,
  query,
  resolver,
  type SchemaWeaver,
  silk,
  weave,
} from "@gqloom/core"
import { type Type, type } from "arktype"
import {
  execute as executeGraphQL,
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  type GraphQLNamedType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
  parse,
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
      dog: query(silk.nullable(Dog), () => ({
        name: "",
        birthday: "2012-12-12",
      })),
      cat: query(silk.nullable(Cat), () => ({
        name: "",
        birthday: "2012-12-12",
      })),
      dogs: query(silk.list(Dog), () => [
        { name: "", birthday: "2012-12-12" },
        { name: "", birthday: "2012-12-12" },
      ]),
      mustDog: query(Dog, () => ({ name: "", birthday: "2012-12-12" })),
      mustDogs: query(Dog.array(), () => []),
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
        dog: Dog
        cat: Cat
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

  it("should handle enum", () => {
    const Fruit = type("'apple' | 'banana' | 'orange'")
    collectNames({ Fruit })

    expect(printArktypeSchema(Fruit)).toMatchInlineSnapshot(`
      "enum Fruit {
        apple
        banana
        orange
      }"
    `)
  })

  it("should handle union as GraphQLUnionType", async () => {
    const Cat = type({
      __typename: "'Cat'",
      name: "string",
      loveFish: "boolean",
    })
    const Dog = type({
      __typename: "'Dog'",
      name: "string",
      loveBone: "boolean",
    })
    const Animal = Cat.or(Dog)
    collectNames({ Cat, Dog, Animal })

    const gqlType = getGraphQLType(Animal)
    expect(gqlType).toBeInstanceOf(GraphQLNonNull)
    const printed = printType(
      (gqlType as GraphQLNonNull<any>).ofType as GraphQLNamedType
    )
    expect(printed).toEqual("union Animal = Cat | Dog")

    const animals = [
      { __typename: "Cat" as const, name: "Fluffy", loveFish: true },
      { __typename: "Dog" as const, name: "Rex", loveBone: false },
      { __typename: "Cat" as const, name: "Whiskers", loveFish: false },
    ]

    const animalResolver = resolver({
      animals: query(silk.list(Animal)).resolve(() => animals),
    })

    const schema = weave(arkTypeWeaver, animalResolver)

    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type Query {
        animals: [Animal!]!
      }

      union Animal = Cat | Dog

      type Cat {
        loveFish: Boolean!
        name: String!
      }

      type Dog {
        loveBone: Boolean!
        name: String!
      }"
    `)

    const result = await executeGraphQL({
      schema,
      document: parse(/* GraphQL */ `
        query {
          animals {
            __typename
            ... on Cat {
              name
              loveFish
            }
            ... on Dog {
              name
              loveBone
            }
          }
        }
      `),
    })

    expect(result.errors).toBeUndefined()
    expect(result.data).toEqual({
      animals: [
        { __typename: "Cat", name: "Fluffy", loveFish: true },
        { __typename: "Dog", name: "Rex", loveBone: false },
        { __typename: "Cat", name: "Whiskers", loveFish: false },
      ],
    })
  })

  describe("should handle input types", () => {
    it("should convert object schema to input type for mutations", () => {
      const DogInput = type({
        "__typename?": "'DogInput'",
        name: "string",
        birthday: "string",
      })

      const r1 = resolver({
        createDog: query(type("string"))
          .input(DogInput)
          .resolve((data) => data.name),
      })

      const schema = weave(arkTypeWeaver, r1)

      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type Query {
          createDog(birthday: String!, name: String!): String!
        }"
      `)
    })

    it("should handle nested input objects", () => {
      const AddressInput = type({
        "__typename?": "'AddressInput'",
        street: "string",
        city: "string",
      })

      const PersonInput = type({
        "__typename?": "'PersonInput'",
        name: "string",
        address: AddressInput,
      })

      const Person = type({
        "__typename?": "'Person'",
        name: "string",
        address: {
          "__typename?": "'Address'",
          street: "string",
          city: "string",
        },
      })

      const r1 = resolver.of(Person, {
        createPerson: query(Person)
          .input({ data: PersonInput })
          .resolve(({ data }) => ({
            name: data.name,
            address: {
              street: data.address.street,
              city: data.address.city,
            },
          })),
      })

      const schema = weave(arkTypeWeaver, r1)

      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type Person {
          address: Address!
          name: String!
        }

        type Address {
          city: String!
          street: String!
        }

        type Query {
          createPerson(data: PersonInput!): Person!
        }

        input PersonInput {
          address: AddressInput!
          name: String!
        }

        input AddressInput {
          city: String!
          street: String!
        }"
      `)
    })

    it("should handle array inputs", () => {
      const DogInput = type({
        "__typename?": "'DogInput'",
        name: "string",
      })

      const Dog = type({
        "__typename?": "'Dog'",
        name: "string",
      })

      const r1 = resolver.of(Dog, {
        createDogs: query(silk.list(Dog))
          .input({
            dogs: silk.list(DogInput),
          })
          .resolve(({ dogs }) => dogs.map((dog) => ({ name: dog.name }))),
      })

      const schema = weave(arkTypeWeaver, r1)

      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type Dog {
          name: String!
        }

        type Query {
          createDogs(dogs: [DogInput!]!): [Dog!]!
        }

        input DogInput {
          name: String!
        }"
      `)
    })

    it("should avoid duplicate input types", () => {
      const DogInput = type({
        "__typename?": "'DogInput'",
        name: "string",
        "birthday?": "string",
      })

      const Dog = type({
        "__typename?": "'Dog'",
        name: "string",
        "birthday?": "string",
      })

      const r1 = resolver.of(Dog, {
        createDog: query(Dog)
          .input(DogInput)
          .resolve((data) => ({
            name: data.name,
            birthday: data.birthday || "unknown",
          })),
        updateDog: query(Dog)
          .input({
            data: DogInput,
            id: type("string"),
          })
          .resolve(({ data }) => ({
            name: data.name,
            birthday: data.birthday || "unknown",
          })),
        createDogs: query(silk.list(Dog))
          .input({
            dogs: silk.list(DogInput),
          })
          .resolve(({ dogs }) =>
            dogs.map((dog: any) => ({
              name: dog.name,
              birthday: dog.birthday || "unknown",
            }))
          ),
      })

      const schema = weave(arkTypeWeaver, r1)

      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type Dog {
          name: String!
          birthday: String
        }

        type Query {
          createDog(name: String!, birthday: String): Dog!
          updateDog(data: DogInput!, id: String!): Dog!
          createDogs(dogs: [DogInput!]!): [Dog!]!
        }

        input DogInput {
          name: String!
          birthday: String
        }"
      `)
    })
  })
})

const arkTypeWeaver: SchemaWeaver = {
  vendor: "arktype",
  getGraphQLType: (type: Type) =>
    JSONWeaver.getGraphQLType(type.toJsonSchema() as JSONSchema, {
      source: type,
    }),
}

function getGraphQLType(type: GraphQLSilk) {
  const context = initWeaverContext()
  context.vendorWeavers.set(arkTypeWeaver.vendor, arkTypeWeaver)
  return provideWeaverContext(() => silk.getType(type), context)
}

function printArktypeSchema(type: Type) {
  let gqlType = getGraphQLType(type)
  while ("ofType" in gqlType) gqlType = gqlType.ofType
  return printType(gqlType as GraphQLNamedType)
}

function printResolver(...resolvers: Loom.Resolver[]): string {
  const schema = weave(arkTypeWeaver, ...resolvers)
  return printSchema(schema)
}
