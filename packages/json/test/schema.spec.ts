import { type Loom, field, query, resolver, silk, weave } from "@gqloom/core"
import Ajv from "ajv"
import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  type GraphQLNamedType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLString,
  printSchema,
  printType,
} from "graphql"
import { describe, expect, it } from "vitest"
import { JSONWeaver, jsonSilk } from "../src"

const getGraphQLType = JSONWeaver.getGraphQLType

describe("JSONWeaver", () => {
  it("should handle scalar", () => {
    expect(getGraphQLType({ type: "string" })).toEqual(
      new GraphQLNonNull(GraphQLString)
    )
    expect(getGraphQLType({ type: ["string", "null"] })).toEqual(GraphQLString)
    expect(getGraphQLType({ type: "number" })).toEqual(
      new GraphQLNonNull(GraphQLFloat)
    )
    expect(getGraphQLType({ type: "integer" })).toEqual(
      new GraphQLNonNull(GraphQLInt)
    )
    expect(getGraphQLType({ type: "boolean" })).toEqual(
      new GraphQLNonNull(GraphQLBoolean)
    )
  })

  it("should handle default value as non-nullable", () => {
    expect(
      getGraphQLType({ type: ["string", "null"], default: "" })
    ).toBeInstanceOf(GraphQLNonNull)
  })

  it("should handle array", () => {
    expect(
      getGraphQLType({ type: "array", items: { type: "string" } })
    ).toEqual(
      new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString)))
    )

    expect(
      getGraphQLType({
        type: "array",
        items: { type: ["string", "null"] },
      })
    ).toEqual(new GraphQLNonNull(new GraphQLList(GraphQLString)))

    expect(
      getGraphQLType({
        type: ["array", "null"],
        items: { type: "string" },
      })
    ).toEqual(new GraphQLList(new GraphQLNonNull(GraphQLString)))
  })

  it("should handle object", () => {
    const CatSchema = {
      title: "Cat",
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "integer" },
        loveFish: { type: ["boolean", "null"] },
      },
      required: ["name", "age"],
    } as const

    const gqlType = getGraphQLType(CatSchema)
    expect(gqlType).toBeInstanceOf(GraphQLNonNull)
    expect((gqlType as GraphQLNonNull<any>).ofType).toBeInstanceOf(
      GraphQLObjectType
    )

    expect(printJSONSchema(CatSchema)).toMatchInlineSnapshot(`
      "type Cat {
        name: String!
        age: Int!
        loveFish: Boolean
      }"
    `)
  })

  it("should handle enum", () => {
    const FruitSchema = {
      title: "Fruit",
      description: "Some fruits you might like",
      enum: ["apple", "banana", "orange"],
    } as const

    expect(printJSONSchema(FruitSchema)).toMatchInlineSnapshot(`
      """"Some fruits you might like"""
      enum Fruit {
        apple
        banana
        orange
      }"
    `)
  })

  it("should handle oneOf as union", () => {
    const CatSchema = {
      title: "Cat",
      type: "object",
      properties: {
        name: { type: "string" },
      },
    } as const
    const DogSchema = {
      title: "Dog",
      type: "object",
      properties: {
        name: { type: "string" },
      },
    } as const
    const AnimalSchema = {
      title: "Animal",
      oneOf: [CatSchema, DogSchema],
    } as const

    const gqlType = getGraphQLType(AnimalSchema)
    expect(gqlType).toBeInstanceOf(GraphQLNonNull)
    const printed = printType(
      (gqlType as GraphQLNonNull<any>).ofType as GraphQLNamedType
    )
    expect(printed).toEqual("union Animal = Cat | Dog")
  })

  it("should work with ajv", () => {
    const Dog = jsonSilk({
      title: "Dog",
      type: "object",
      properties: {
        name: { type: "string" },
        birthday: { type: "string" },
      },
      required: ["name", "birthday"],
      additionalProperties: false,
    })
    const ajv = new Ajv()
    const validate = ajv.compile(Dog)
    expect(validate({ name: "Fido", birthday: "2012-12-12" })).toBe(true)
    expect(validate({ name: "Fido", birthday: "2012-12-12", age: 10 })).toBe(
      false
    )
  })

  it("should be able to serialized", () => {
    const Dog = jsonSilk({
      title: "Dog",
      type: "object",
      properties: { name: { type: "string" } },
    })
    const serialized = JSON.stringify(Dog, null, 2)
    expect(serialized).toMatchInlineSnapshot(`
      "{
        "title": "Dog",
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          }
        }
      }"
    `)
  })

  describe("should avoid duplicate", () => {
    it("should avoid duplicate object", () => {
      const Dog = jsonSilk({
        title: "Dog",
        type: "object",
        properties: {
          name: { type: "string" },
          birthday: { type: "string" },
        },
        required: ["name", "birthday"],
        additionalProperties: false,
      })

      const Cat = jsonSilk({
        title: "Cat",
        type: "object",
        properties: {
          name: { type: "string" },
          birthday: { type: "string" },
          friend: Dog,
        },
        required: ["name", "birthday"],
        additionalProperties: false,
      })

      const r1 = resolver.of(Dog, {
        dog: query(silk.nullable(Dog), () => ({
          name: "",
          birthday: "2012-12-12",
        })),
        cat: query(Cat, () => ({
          name: "",
          birthday: "2012-12-12",
        })),
        dogs: query(silk.list(silk.nullable(Dog)), () => [
          { name: "Fido", birthday: "2012-12-12" },
          { name: "Rover", birthday: "2012-12-12" },
        ]),
        mustDog: query(Dog, () => ({
          name: "",
          birthday: "2012-12-12",
        })),
        mustDogs: query(silk.list(Dog), () => []),
        age: field(jsonSilk({ type: "number" })).resolve((dog) => {
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
          friend: Dog
        }"
      `)
    })
  })

  describe("should handle input types", () => {
    it("should convert object schema to input type for mutations", () => {
      const DogInput = jsonSilk({
        title: "DogInput",
        type: "object",
        properties: {
          name: { type: "string" },
          birthday: { type: "string" },
        },
        required: ["name", "birthday"],
        additionalProperties: false,
      })

      const Dog = jsonSilk({
        title: "Dog",
        type: "object",
        properties: {
          name: { type: "string" },
          birthday: { type: "string" },
        },
        required: ["name", "birthday"],
        additionalProperties: false,
      })

      const r1 = resolver.of(Dog, {
        createDog: query(Dog, {
          input: DogInput,
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
      const AddressInput = jsonSilk({
        title: "AddressInput",
        type: "object",
        properties: {
          street: { type: "string" },
          city: { type: "string" },
        },
        required: ["street", "city"],
      })

      const PersonInput = jsonSilk({
        title: "PersonInput",
        type: "object",
        properties: {
          name: { type: "string" },
          address: AddressInput,
        },
        required: ["name", "address"],
      })

      const Person = jsonSilk({
        title: "Person",
        type: "object",
        properties: {
          name: { type: "string" },
          address: {
            type: "object",
            properties: {
              street: { type: "string" },
              city: { type: "string" },
            },
            required: ["street", "city"],
          },
        },
        required: ["name", "address"],
      })

      const r1 = resolver.of(Person, {
        createPerson: query(Person, {
          input: { data: PersonInput },
          resolve: ({ data }) => ({ ...data }),
        }),
      })

      expect(printResolver(r1)).toMatchInlineSnapshot(`
        "type Person {
          name: String!
          address: PersonAddress!
        }

        type PersonAddress {
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
      const DogInput = jsonSilk({
        title: "DogInput",
        type: "object",
        properties: {
          name: { type: "string" },
        },
        required: ["name"],
      })

      const Dog = jsonSilk({
        title: "Dog",
        type: "object",
        properties: {
          name: { type: "string" },
        },
        required: ["name"],
      })

      const r1 = resolver.of(Dog, {
        createDogs: query(
          jsonSilk({
            type: "array",
            items: Dog,
          }),
          {
            input: {
              dogs: jsonSilk({
                type: "array",
                items: DogInput,
              }),
            },
            resolve: ({ dogs }) => dogs,
          }
        ),
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
      const DogInput = jsonSilk({
        title: "DogInput",
        type: "object",
        properties: {
          name: { type: "string" },
          birthday: { type: "string" },
        },
        required: ["name"],
        additionalProperties: false,
      })

      const Dog = jsonSilk({
        title: "Dog",
        type: "object",
        properties: {
          name: { type: "string" },
          birthday: { type: "string" },
        },
        required: ["name"],
        additionalProperties: false,
      })

      const r1 = resolver.of(Dog, {
        createDog: query(Dog, {
          input: DogInput,
          resolve: (data) => ({
            ...data,
            birthday: data.birthday || "unknown",
          }),
        }),
        updateDog: query(Dog, {
          input: { data: DogInput, id: jsonSilk({ type: "string" }) },
          resolve: ({ data }) => ({
            ...data,
            birthday: data.birthday || "unknown",
          }),
        }),
        createDogs: query(
          jsonSilk({
            type: "array",
            items: Dog,
          }),
          {
            input: {
              dogs: jsonSilk({
                type: "array",
                items: DogInput,
              }),
            },
            resolve: ({ dogs }) =>
              dogs.map((dog) => ({
                ...dog,
                birthday: dog.birthday || "unknown",
              })),
          }
        ),
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

  describe("should handle allOf interfaces", () => {
    it("should convert allOf to GraphQL interface", () => {
      const Fruit = jsonSilk({
        title: "Fruit",
        type: "object",
        properties: {
          name: { type: "string" },
          color: { type: "string" },
          price: { type: "number" },
        },
        required: ["name", "color", "price"],
        description: "Some fruits you might like",
      })

      const Orange = jsonSilk({
        title: "Orange",
        allOf: [
          Fruit,
          {
            type: "object",
            properties: {
              sweetness: { type: "number" },
            },
            required: ["sweetness"],
          },
        ],
      })

      const r = resolver.of(Orange, {
        orange: query(Orange, () => ({
          name: "Orange",
          color: "orange",
          price: 1.5,
          sweetness: 8,
        })),
      })

      expect(printResolver(r)).toMatchInlineSnapshot(`
        "type Orange implements Fruit {
          name: String!
          color: String!
          price: Float!
          sweetness: Float!
        }

        """Some fruits you might like"""
        interface Fruit {
          name: String!
          color: String!
          price: Float!
        }

        type Query {
          orange: Orange!
        }"
      `)
    })

    it("should handle object implementing interface via allOf", () => {
      const Fruit = jsonSilk({
        title: "Fruit",
        type: "object",
        properties: {
          color: { type: "string" },
        },
        required: ["color"],
      })

      const Orange = jsonSilk({
        title: "Orange",
        allOf: [
          Fruit,
          {
            type: "object",
            properties: {
              flavor: { type: "string" },
            },
            required: ["flavor"],
          },
        ],
      })

      const Apple = jsonSilk({
        title: "Apple",
        allOf: [
          Fruit,
          {
            type: "object",
            properties: {
              flavor: { type: "string" },
            },
          },
        ],
      })

      const r1 = resolver({
        orange: query(Orange, () => ({ color: "orange", flavor: "sweet" })),
        apple: query(Apple, () => ({ color: "red", flavor: "crisp" })),
      })

      expect(printResolver(r1)).toMatchInlineSnapshot(`
        "type Query {
          orange: Orange!
          apple: Apple!
        }

        type Orange implements Fruit {
          color: String!
          flavor: String!
        }

        interface Fruit {
          color: String!
        }

        type Apple implements Fruit {
          color: String!
          flavor: String
        }"
      `)
    })

    it("should avoid duplicate interfaces", () => {
      const Fruit = jsonSilk({
        title: "Fruit",
        type: "object",
        properties: {
          color: { type: "string" },
        },
      })

      const Orange = jsonSilk({
        title: "Orange",
        allOf: [
          Fruit,
          {
            type: "object",
            properties: {
              flavor: { type: "string" },
            },
            required: ["flavor"],
          },
        ],
      })

      const Apple = jsonSilk({
        title: "Apple",
        allOf: [
          Fruit,
          {
            type: "object",
            properties: {
              flavor: { type: "string" },
            },
          },
        ],
      })

      const r1 = resolver({
        orange: query(silk.nullable(Orange), () => ({
          color: "orange",
          flavor: "sweet",
        })),
        oranges: query(silk.list(silk.nullable(Orange)), () => []),
        apple: query(silk.nullable(Apple), () => ({
          color: "red",
          flavor: "crisp",
        })),
        apples: query(silk.list(Apple), () => []),
        mustOrange: query(Orange, () => ({ color: "orange", flavor: "sweet" })),
        mustApples: query(silk.list(Apple), () => []),
      })

      expect(printResolver(r1)).toMatchInlineSnapshot(`
        "type Query {
          orange: Orange
          oranges: [Orange]!
          apple: Apple
          apples: [Apple!]!
          mustOrange: Orange!
          mustApples: [Apple!]!
        }

        type Orange implements Fruit {
          color: String
          flavor: String!
        }

        interface Fruit {
          color: String
        }

        type Apple implements Fruit {
          color: String
          flavor: String
        }"
      `)
    })
  })

  describe("should handle custom type mapping", () => {
    it("should support preset GraphQL types via config", () => {
      const GraphQLDate = new GraphQLScalarType<Date, string>({
        name: "Date",
      })

      const Dog = jsonSilk({
        title: "Dog",
        type: "object",
        properties: {
          name: { type: "string" },
          birthday: { type: "string", format: "date" },
        },
        required: ["name"],
      })

      const config = JSONWeaver.config({
        presetGraphQLType: (schema) => {
          if (typeof schema === "object" && schema.format === "date")
            return GraphQLDate
        },
      })

      const r1 = resolver({ dog: query(Dog, () => ({}) as any) })
      const schema1 = weave(r1, config)

      expect(printSchema(schema1)).toMatchInlineSnapshot(`
        "type Query {
          dog: Dog!
        }

        type Dog {
          name: String!
          birthday: Date
        }

        scalar Date"
      `)
    })

    it("should handle custom scalar types", () => {
      const GraphQLUUID = new GraphQLScalarType<string, string>({
        name: "UUID",
      })

      const User = jsonSilk({
        title: "User",
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
        },
        required: ["id", "name"],
      })

      const config = JSONWeaver.config({
        presetGraphQLType: (schema) => {
          if (typeof schema === "object" && schema.format === "uuid")
            return GraphQLUUID
        },
      })

      const r1 = resolver({ user: query(User, () => ({}) as any) })
      const schema1 = weave(r1, config)

      expect(printSchema(schema1)).toMatchInlineSnapshot(`
        "type Query {
          user: User!
        }

        type User {
          id: UUID!
          name: String!
        }

        scalar UUID"
      `)
    })

    it("should use config to override default type mappings", () => {
      const GraphQLLongString = new GraphQLScalarType<string, string>({
        name: "LongString",
      })

      const Post = jsonSilk({
        title: "Post",
        type: "object",
        properties: {
          title: { type: "string" },
          content: { type: "string", maxLength: 10000 },
        },
        required: ["title", "content"],
      })

      const config = JSONWeaver.config({
        presetGraphQLType: (schema) => {
          if (
            typeof schema === "object" &&
            schema.type === "string" &&
            schema.maxLength &&
            schema.maxLength > 1000
          ) {
            return GraphQLLongString
          }
        },
      })

      const r1 = resolver({ post: query(Post, () => ({}) as any) })
      const schema1 = weave(r1, config)

      expect(printSchema(schema1)).toMatchInlineSnapshot(`
        "type Query {
          post: Post!
        }

        type Post {
          title: String!
          content: LongString!
        }

        scalar LongString"
      `)
    })
  })

  describe.todo("should handle hidden fields", () => {
    it.todo("should exclude fields marked as hidden")
    it.todo("should support field.hidden configuration")
  })

  describe.todo("should handle discriminated unions", () => {
    it.todo("should handle oneOf with discriminator property")
    it.todo("should provide resolveType function for discriminated unions")
    it.todo("should validate discriminator values")
  })

  describe.todo("should handle field merging and extension", () => {
    it.todo("should merge fields from multiple resolvers")
    it.todo("should allow extending object types with additional fields")
    it.todo("should handle field conflicts properly")
  })

  describe.todo("should handle runtime execution", () => {
    it.todo("should execute queries with enum values")
    it.todo("should validate input data against schema")
    it.todo("should handle default values in execution")
  })

  describe.todo("should handle complex schema patterns", () => {
    it.todo("should handle conditional schemas (if/then/else)")
    it.todo("should handle schema composition with definitions")
    it.todo("should handle recursive schemas")
  })
})

function printJSONSchema(schema: Parameters<typeof getGraphQLType>[0]): string {
  let gqlType = getGraphQLType(schema)
  while ("ofType" in gqlType) gqlType = gqlType.ofType
  return printType(gqlType as GraphQLNamedType)
}

function printResolver(...resolvers: Loom.Resolver[]): string {
  const schema = weave(...resolvers)
  return printSchema(schema)
}
