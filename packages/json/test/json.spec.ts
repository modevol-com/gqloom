import { field, type Loom, query, resolver, silk, weave } from "@gqloom/core"
import Ajv from "ajv"
import {
  execute as executeGraphQL,
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  type GraphQLNamedType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLString,
  parse,
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

  it("should handle type with default value as nullable", () => {
    expect(
      getGraphQLType({ type: ["string", "null"], default: "" })
    ).not.toBeInstanceOf(GraphQLNonNull)
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

  it("should handle enum", () => {
    const Fruit = jsonSilk({
      title: "Fruit",
      description: "Some fruits you might like",
      enum: ["apple", "banana", "orange"],
    })

    expect(printJSONSchema(Fruit)).toMatchInlineSnapshot(`
      """"Some fruits you might like"""
      enum Fruit {
        apple
        banana
        orange
      }"
    `)
  })

  it("should handle oneOf as union", () => {
    const Cat = jsonSilk({
      type: "object",
      properties: {
        __typename: { const: "Cat" },
        name: { type: "string" },
        loveFish: { type: "boolean" },
      },
    })
    const Dog = jsonSilk({
      type: "object",
      properties: {
        __typename: { const: "Dog" },
        name: { type: "string" },
        loveBone: { type: "boolean" },
      },
    })
    const Animal = jsonSilk({
      title: "Animal",
      oneOf: [Cat, Dog],
    })

    const gqlType = getGraphQLType(Animal)
    expect(gqlType).toBeInstanceOf(GraphQLNonNull)
    const printed = printType(
      (gqlType as GraphQLNonNull<any>).ofType as GraphQLNamedType
    )
    expect(printed).toEqual("union Animal = Cat | Dog")
  })

  it("should handle oneOf as union - integration test", async () => {
    // Define the types
    const Cat = jsonSilk({
      type: "object",
      properties: {
        __typename: { const: "Cat" },
        name: { type: "string" },
        loveFish: { type: "boolean" },
      },
      required: ["name", "loveFish"],
    })
    const Dog = jsonSilk({
      type: "object",
      properties: {
        __typename: { const: "Dog" },
        name: { type: "string" },
        loveBone: { type: "boolean" },
      },
      required: ["name", "loveBone"],
    })
    const Animal = jsonSilk({
      title: "Animal",
      oneOf: [Cat, Dog],
    })

    // Mock data
    const animals = [
      { __typename: "Cat" as const, name: "Fluffy", loveFish: true },
      { __typename: "Dog" as const, name: "Rex", loveBone: false },
      { __typename: "Cat" as const, name: "Whiskers", loveFish: false },
    ]

    // Define array type using Animal union
    const AnimalsArray = jsonSilk({
      type: "array",
      items: Animal,
    })

    // Create resolver
    const animalResolver = resolver({
      animals: query(AnimalsArray).resolve(() => animals),
    })

    // Create schema
    const schema = weave(animalResolver)

    // Test the schema structure
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

    // Execute query
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

  it("should handle optional fields that are non-null by default", () => {
    const MyObject = jsonSilk({
      title: "MyObject",
      type: "object",
      properties: {
        optionalString: { type: "string" },
      },
    })
    const printed = printJSONSchema(MyObject)
    expect(printed).toContain("optionalString: String") // Not String!
    expect(printed).toMatchInlineSnapshot(`
      "type MyObject {
        optionalString: String
      }"
    `)
  })

  describe("error handling", () => {
    it("should throw for boolean schema", () => {
      expect(() => getGraphQLType(true)).toThrow(
        "Boolean JSON schemas are not supported"
      )
      expect(() => getGraphQLType(false)).toThrow(
        "Boolean JSON schemas are not supported"
      )
    })

    it("should throw for union type with non-object member", () => {
      const Cat = jsonSilk({
        title: "Cat",
        type: "object",
        properties: { name: { type: "string" } },
      })
      const Age = { type: "integer" } as const
      const Animal = jsonSilk({ title: "Animal", oneOf: [Cat, Age] })
      const r = resolver({ animal: query(Animal, () => ({})) })
      expect(() => weave(r)).toThrow(
        "Union type member of Animal must be an object type"
      )
    })

    it("should throw for invalid array schema", () => {
      expect(() => getGraphQLType({ type: "array" })).toThrow(
        "Array schema must have a single object in 'items'"
      )
      expect(() => getGraphQLType({ type: "array", items: true })).toThrow(
        "Array schema must have a single object in 'items'"
      )
      expect(() =>
        getGraphQLType({ type: "array", items: [{ type: "string" }] })
      ).toThrow("Array schema must have a single object in 'items'")
    })

    it("should throw for boolean schema in properties", () => {
      const MyObject = jsonSilk({
        title: "MyObject",
        type: "object",
        properties: {
          a: true,
        },
      })
      const r = resolver({ obj: query(MyObject, () => ({})) })
      expect(() => weave(r)).toThrow(
        "Boolean JSON schemas are not supported in properties"
      )
    })

    it("should throw for standalone null type", () => {
      expect(() => getGraphQLType({ type: "null" })).toThrow(
        "Standalone 'null' type is not supported"
      )
    })

    it("should throw for unsupported schema type", () => {
      expect(() => getGraphQLType({})).toThrow(
        "Unsupported JSON schema type: undefined"
      )
    })
  })

  describe("should handle object", () => {
    it("should handle object", () => {
      const Cat = jsonSilk({
        title: "Cat",
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "integer" },
          loveFish: { type: ["boolean", "null"] },
        },
        required: ["name", "age"],
      })

      const gqlType = getGraphQLType(Cat)
      expect(gqlType).toBeInstanceOf(GraphQLNonNull)
      expect((gqlType as GraphQLNonNull<any>).ofType).toBeInstanceOf(
        GraphQLObjectType
      )

      expect(printJSONSchema(Cat)).toMatchInlineSnapshot(`
      "type Cat {
        name: String!
        age: Int!
        loveFish: Boolean
      }"
    `)

      const Cat2 = jsonSilk({
        type: "object",
        description: "A cute cat",
        properties: {
          __typename: { const: "Cat" },
          name: { type: "string" },
          age: { type: "integer" },
          loveFish: {
            type: ["boolean", "null"],
            description: "Does the cat love fish?",
          },
        },
        required: ["name", "age"],
      })

      expect(printJSONSchema(Cat2)).toMatchInlineSnapshot(`
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
      const Dog = {
        title: "Dog",
        type: "object",
        properties: {
          name: { type: "string" },
          birthday: { type: "string" },
        },
        required: ["name", "birthday"],
        additionalProperties: false,
      } as const

      const Cat = {
        title: "Cat",
        type: "object",
        properties: {
          name: { type: "string" },
          birthday: { type: "string" },
          friend: Dog,
        },
        required: ["name", "birthday"],
        additionalProperties: false,
      } as const

      const r1 = resolver.of(jsonSilk(Dog), {
        dog: query(silk.nullable(jsonSilk(Dog)), () => ({
          name: "",
          birthday: "2012-12-12",
        })),
        cat: query(jsonSilk(Cat), () => ({
          name: "",
          birthday: "2012-12-12",
        })),
        dogs: query(silk.list(silk.nullable(jsonSilk(Dog))), () => [
          { name: "Fido", birthday: "2012-12-12" },
          { name: "Rover", birthday: "2012-12-12" },
        ]),
        mustDog: query(jsonSilk(Dog), () => ({
          name: "",
          birthday: "2012-12-12",
        })),
        mustDogs: query(silk.list(jsonSilk(Dog)), () => []),
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

    it("should handle title as name", () => {
      const Dog = jsonSilk({
        title: "Dog",
        type: "object",
        properties: { name: { type: "string" } },
      })
      expect(printJSONSchema(Dog)).toMatchInlineSnapshot(`
        "type Dog {
          name: String
        }"
      `)
    })

    it("should handle __typename as name", () => {
      const Dog = jsonSilk({
        title: "Dog",
        type: "object",
        properties: {
          __typename: { const: "Dog" },
          name: { type: "string" },
        },
      })

      expect(printJSONSchema(Dog)).toMatchInlineSnapshot(`
        "type Dog {
          name: String
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

    it("should handle multiple interfaces", () => {
      const Named = jsonSilk({
        title: "Named",
        type: "object",
        properties: {
          name: { type: "string" },
        },
        required: ["name"],
      })

      const Colored = jsonSilk({
        title: "Colored",
        type: "object",
        properties: {
          color: { type: "string" },
        },
        required: ["color"],
      })

      const Orange = jsonSilk({
        title: "Orange",
        allOf: [
          Named,
          Colored,
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
          sweetness: 8,
        })),
      })

      expect(printResolver(r)).toMatchInlineSnapshot(`
        "type Orange implements Named & Colored {
          name: String!
          color: String!
          sweetness: Float!
        }

        interface Named {
          name: String!
        }

        interface Colored {
          color: String!
        }

        type Query {
          orange: Orange!
        }"
      `)
    })

    it("should handle allOf without interfaces (just property merging)", () => {
      const BasicInfo = jsonSilk({
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
        required: ["name"],
      })

      const ContactInfo = jsonSilk({
        type: "object",
        properties: {
          email: { type: "string" },
          phone: { type: "string" },
        },
        required: ["email"],
      })

      const Person = jsonSilk({
        title: "Person",
        allOf: [BasicInfo, ContactInfo],
      })

      const r = resolver.of(Person, {
        person: query(Person, () => ({
          name: "John",
          age: 30,
          email: "john@example.com",
          phone: "123-456-7890",
        })),
      })

      expect(printResolver(r)).toMatchInlineSnapshot(`
        "type Person {
          name: String!
          age: Float
          email: String!
          phone: String
        }

        type Query {
          person: Person!
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

  describe("should handle field merging and extension", () => {
    it("should support field.hidden configuration", () => {
      const Dog = jsonSilk({
        title: "Dog",
        type: "object",
        properties: {
          name: { type: "string" },
          birthday: { type: "string" },
        },
      })

      const r1 = resolver.of(Dog, {
        dog: query(Dog, () => ({})),
        birthday: field.hidden,
      })

      expect(printResolver(r1)).toMatchInlineSnapshot(`
        "type Dog {
          name: String
        }

        type Query {
          dog: Dog!
        }"
      `)
    })
    it("should merge fields from multiple resolvers", () => {
      const Dog = jsonSilk({
        title: "Dog",
        type: "object",
        properties: {
          name: { type: "string" },
          birthday: { type: "string" },
        },
      })

      const r1 = resolver.of(Dog, {
        dog: query(Dog, () => ({})),
        home: field(jsonSilk({ type: "string" })).resolve(() => ""),
      })

      const r2 = resolver.of(Dog, {
        hobby: field(
          jsonSilk({ type: "array", items: { type: "string" } })
        ).resolve(() => []),
      })

      const schema = weave(r1, r2)

      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type Dog {
          name: String
          birthday: String
          home: String!
          hobby: [String!]!
        }

        type Query {
          dog: Dog!
        }"
      `)
    })
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
