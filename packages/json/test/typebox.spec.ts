import {
  type GraphQLSilk,
  type Loom,
  SYMBOLS,
  field,
  query,
  resolver,
  silk,
  weave,
} from "@gqloom/core"
import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  type GraphQLNamedType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
  execute as executeGraphQL,
  parse,
  printSchema,
  printType,
} from "graphql"
import { type Static, type TSchema, Type } from "typebox"
import { describe, expect, it } from "vitest"
import { JSONWeaver, jsonSilk } from "../src"

function typeSilk<T extends TSchema>(
  type: T
): T & GraphQLSilk<Static<T>, Static<T>> {
  return JSONWeaver.unravel(type) as T & GraphQLSilk<Static<T>, Static<T>>
}

const getGraphQLType = (silk: GraphQLSilk) => silk[SYMBOLS.GET_GRAPHQL_TYPE]!()

function printTypeboxSchema(silk: GraphQLSilk): string {
  let gqlType = getGraphQLType(silk)
  while ("ofType" in gqlType) gqlType = gqlType.ofType
  return printType(gqlType as GraphQLNamedType)
}

function printResolver(...resolvers: Loom.Resolver[]): string {
  const schema = weave(...resolvers)
  return printSchema(schema)
}

describe("typeSilk", () => {
  it("should handle scalar", () => {
    expect(getGraphQLType(typeSilk(Type.String()))).toEqual(
      new GraphQLNonNull(GraphQLString)
    )
    expect(
      getGraphQLType(typeSilk(Type.Union([Type.String(), Type.Null()])))
    ).toEqual(GraphQLString)

    expect(getGraphQLType(typeSilk(Type.Number()))).toEqual(
      new GraphQLNonNull(GraphQLFloat)
    )
    expect(getGraphQLType(typeSilk(Type.Integer()))).toEqual(
      new GraphQLNonNull(GraphQLInt)
    )
    expect(getGraphQLType(typeSilk(Type.Boolean()))).toEqual(
      new GraphQLNonNull(GraphQLBoolean)
    )
  })

  it("should handle type with default value as nullable", () => {
    expect(
      getGraphQLType(typeSilk(Type.String({ default: "" })))
    ).not.toBeInstanceOf(GraphQLNonNull)
  })

  it("should handle array", () => {
    expect(getGraphQLType(typeSilk(Type.Array(Type.String())))).toEqual(
      new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString)))
    )

    expect(
      getGraphQLType(
        typeSilk(Type.Array(Type.Union([Type.String(), Type.Null()])))
      )
    ).toEqual(new GraphQLNonNull(new GraphQLList(GraphQLString)))

    expect(
      getGraphQLType(
        typeSilk(Type.Union([Type.Array(Type.String()), Type.Null()]))
      )
    ).toEqual(new GraphQLList(new GraphQLNonNull(GraphQLString)))
  })

  it("should handle object", () => {
    const Cat = typeSilk(
      Type.Object(
        {
          name: Type.String(),
          age: Type.Integer(),
          loveFish: Type.Optional(Type.Boolean()),
        },
        { title: "Cat" }
      )
    )

    const gqlType = getGraphQLType(Cat)
    expect(gqlType).toBeInstanceOf(GraphQLNonNull)
    expect((gqlType as GraphQLNonNull<any>).ofType).toBeInstanceOf(
      GraphQLObjectType
    )

    expect(printTypeboxSchema(Cat)).toMatchInlineSnapshot(`
      "type Cat {
        name: String!
        age: Int!
        loveFish: Boolean
      }"
    `)

    const Cat2 = typeSilk(
      Type.Object(
        {
          __typename: Type.Optional(Type.Literal("Cat")),
          name: Type.String(),
          age: Type.Integer(),
          loveFish: Type.Optional(
            Type.Boolean({ description: "Does the cat love fish?" })
          ),
        },
        { description: "A cute cat" }
      )
    )

    expect(printTypeboxSchema(Cat2)).toMatchInlineSnapshot(`
      """"A cute cat"""
      type Cat {
        name: String!
        age: Int!

        """Does the cat love fish?"""
        loveFish: Boolean
      }"
    `)
  })

  it("should avoid duplicate object", () => {
    const Dog = Type.Object(
      {
        name: Type.String(),
        birthday: Type.String(),
      },
      { title: "Dog", additionalProperties: false }
    )

    const Cat = Type.Object(
      {
        name: Type.String(),
        birthday: Type.String(),
      },
      { title: "Cat", additionalProperties: false }
    )

    const r1 = resolver.of(typeSilk(Dog), {
      dog: query(silk.nullable(typeSilk(Dog)), () => ({
        name: "",
        birthday: "2012-12-12",
      })),
      cat: query(typeSilk(Cat), () => ({
        name: "",
        birthday: "2012-12-12",
      })),
      dogs: query(silk.list(silk.nullable(typeSilk(Dog))), () => [
        { name: "Fido", birthday: "2012-12-12" },
        { name: "Rover", birthday: "2012-12-12" },
      ]),
      mustDog: query(typeSilk(Dog), () => ({
        name: "",
        birthday: "2012-12-12",
      })),
      mustDogs: query(typeSilk(Type.Array(Dog)), () => []),
      age: field(typeSilk(Type.Number())).resolve((dog) => {
        return new Date().getFullYear() - new Date(dog.birthday).getFullYear()
      }),
    })

    expect(printResolver(r1)).toMatchInlineSnapshot(`
      "type Dog {
        name: String!
        birthday: String!
        age: Float!
      }

      type Query {
        dog: Dog
        cat: Cat!
        dogs: [Dog]!
        mustDog: Dog!
        mustDogs: [Dog!]!
      }

      type Cat {
        name: String!
        birthday: String!
      }"
    `)
  })

  it("should handle enum", () => {
    const Fruit = typeSilk(
      Type.Enum(["apple", "banana", "orange"], {
        title: "Fruit",
        description: "Some fruits you might like",
      })
    )

    expect(printTypeboxSchema(Fruit)).toMatchInlineSnapshot(`
      """"Some fruits you might like"""
      enum Fruit {
        apple
        banana
        orange
      }"
    `)
  })

  it("should handle union as GraphQLUnionType", async () => {
    const Cat = Type.Object(
      {
        __typename: Type.Literal("Cat"),
        name: Type.String(),
        loveFish: Type.Boolean(),
      },
      { title: "Cat" }
    )
    const Dog = Type.Object(
      {
        __typename: Type.Literal("Dog"),
        name: Type.String(),
        loveBone: Type.Boolean(),
      },
      { title: "Dog" }
    )
    const Animal = typeSilk(Type.Union([Cat, Dog], { title: "Animal" }))

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

    const AnimalsArray = typeSilk(Type.Array(Animal))
    const animalResolver = resolver({
      animals: query(AnimalsArray).resolve(() => animals),
    })

    const schema = weave(animalResolver)

    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type Query {
        animals: [Animal!]!
      }

      union Animal = Cat | Dog

      type Cat {
        name: String!
        loveFish: Boolean!
      }

      type Dog {
        name: String!
        loveBone: Boolean!
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
      const DogInput = Type.Object(
        {
          name: Type.String(),
          birthday: Type.String(),
        },
        { title: "DogInput", additionalProperties: false }
      )

      const Dog = typeSilk(
        Type.Object(
          {
            name: Type.String(),
            birthday: Type.String(),
          },
          { title: "Dog", additionalProperties: false }
        )
      )

      const r1 = resolver.of(Dog, {
        createDog: query(Dog, {
          input: typeSilk(DogInput),
          resolve: (data) => ({ ...data }),
        }),
      })

      expect(printResolver(r1)).toMatchInlineSnapshot(`
        "type Dog {
          name: String!
          birthday: String!
        }

        type Query {
          createDog(name: String!, birthday: String!): Dog!
        }"
      `)
    })

    it("should handle nested input objects", () => {
      const AddressInput = Type.Object(
        {
          street: Type.String(),
          city: Type.String(),
        },
        { title: "AddressInput" }
      )

      const PersonInput = Type.Object(
        {
          name: Type.String(),
          address: AddressInput,
        },
        { title: "PersonInput" }
      )

      const Person = typeSilk(
        Type.Object(
          {
            name: Type.String(),
            address: Type.Object({
              __typename: Type.Optional(Type.Literal("Address")),
              street: Type.String(),
              city: Type.String(),
            }),
          },
          { title: "Person" }
        )
      )

      const r1 = resolver.of(Person, {
        createPerson: query(Person, {
          input: { data: typeSilk(PersonInput) },
          resolve: ({ data }) => ({ ...data }),
        }),
      })

      expect(printResolver(r1)).toMatchInlineSnapshot(`
        "type Person {
          name: String!
          address: Address!
        }

        type Address {
          street: String!
          city: String!
        }

        type Query {
          createPerson(data: PersonInput!): Person!
        }

        input PersonInput {
          name: String!
          address: AddressInput!
        }

        input AddressInput {
          street: String!
          city: String!
        }"
      `)
    })

    it("should handle array inputs", () => {
      const DogInput = Type.Object(
        {
          name: Type.String(),
        },
        { title: "DogInput" }
      )

      const Dog = typeSilk(
        Type.Object(
          {
            name: Type.String(),
          },
          { title: "Dog" }
        )
      )

      const r1 = resolver.of(Dog, {
        createDogs: query(typeSilk(Type.Array(Dog)), {
          input: {
            dogs: typeSilk(Type.Array(DogInput)),
          },
          resolve: ({ dogs }) => dogs,
        }),
      })

      expect(printResolver(r1)).toMatchInlineSnapshot(`
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
      const DogInput = Type.Object(
        {
          name: Type.String(),
          birthday: Type.Optional(Type.String()),
        },
        { title: "DogInput", additionalProperties: false }
      )

      const Dog = typeSilk(
        Type.Object(
          {
            name: Type.String(),
            birthday: Type.Optional(Type.String()),
          },
          { title: "Dog", additionalProperties: false }
        )
      )

      const r1 = resolver.of(Dog, {
        createDog: query(Dog, {
          input: typeSilk(DogInput),
          resolve: (data) => ({
            ...data,
            birthday: data.birthday || "unknown",
          }),
        }),
        updateDog: query(Dog, {
          input: {
            data: typeSilk(DogInput),
            id: jsonSilk({ type: "string" }),
          },
          resolve: ({ data }) => ({
            ...data,
            birthday: data.birthday || "unknown",
          }),
        }),
        createDogs: query(typeSilk(Type.Array(Dog)), {
          input: {
            dogs: typeSilk(Type.Array(DogInput)),
          },
          resolve: ({ dogs }) =>
            dogs.map((dog: any) => ({
              ...dog,
              birthday: dog.birthday || "unknown",
            })),
        }),
      })

      expect(printResolver(r1)).toMatchInlineSnapshot(`
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
