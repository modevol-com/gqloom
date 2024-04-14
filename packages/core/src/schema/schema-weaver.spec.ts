import { describe, it, expect } from "vitest"
import {
  GraphQLFloat,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
  printSchema,
  lexicographicSortSchema,
  GraphQLInt,
} from "graphql"
import { silk } from "../resolver"
import { loom } from "../resolver"
import { SchemaWeaver } from "./schema-weaver"

const { resolver, query, mutation, field } = loom

describe("SchemaWeaver", () => {
  it("should weave schema", () => {
    interface IGiraffe {
      name: string
      birthday: Date
      heightInMeters: number
    }

    const Giraffe = silk<IGiraffe>(
      new GraphQLObjectType({
        name: "Giraffe",
        fields: {
          name: { type: new GraphQLNonNull(GraphQLString) },
          birthday: { type: new GraphQLNonNull(GraphQLString) },
          heightInMeters: { type: new GraphQLNonNull(GraphQLFloat) },
        },
      })
    )

    const GiraffeInput = silk<Partial<IGiraffe>>(
      new GraphQLObjectType({
        name: "GiraffeInput",
        fields: {
          name: { type: GraphQLString },
          birthday: { type: GraphQLString },
          heightInMeters: { type: GraphQLFloat },
        },
      })
    )

    const simpleFieldResolver = resolver.of(Giraffe, {
      age: field(silk(GraphQLInt), async (giraffe) => {
        return new Date().getFullYear() - giraffe.birthday.getFullYear()
      }),
      greeting: field(silk(GraphQLString), {
        input: { myName: silk<string | undefined>(GraphQLString) },
        resolve: (giraffe, input) => {
          return `Hello, ${input.myName ?? "my friend"}! My name is ${giraffe.name}.`
        },
      }),
    })

    const simpleResolver = resolver({
      giraffe: query(Giraffe, {
        input: { name: silk(GraphQLString) },
        resolve: (input) => {
          return {
            name: input.name ?? "what's your name?",
            birthday: new Date(),
            heightInMeters: 5,
          }
        },
      }),
      saveGiraffe: mutation(Giraffe, {
        input: GiraffeInput,
        resolve: (input) => {
          return {
            name: input.name ?? "Giraffe",
            birthday: input.birthday ?? new Date(),
            heightInMeters: input.heightInMeters ?? 5,
          }
        },
      }),
      updateGiraffe: mutation(Giraffe, {
        input: { data: GiraffeInput },
        resolve: ({ data }) => {
          return {
            name: data.name ?? "Giraffe",
            birthday: data.birthday ?? new Date(),
            heightInMeters: data.heightInMeters ?? 5,
          }
        },
      }),
      createGiraffe: mutation(Giraffe, {
        input: silk<{ data: Partial<IGiraffe> }>(
          new GraphQLObjectType({
            name: "CreateGiraffeInput",
            fields: {
              data: { type: GiraffeInput.getType() },
            },
          })
        ),
        resolve: ({ data }) => {
          return {
            name: data.name ?? "Giraffe",
            birthday: data.birthday ?? new Date(),
            heightInMeters: data.heightInMeters ?? 5,
          }
        },
      }),
    })

    const schema = new SchemaWeaver()
      .add(simpleResolver)
      .add(simpleFieldResolver)
      .weaveGraphQLSchema()

    expect(printSchema(lexicographicSortSchema(schema))).toMatchInlineSnapshot(`
      "type Giraffe {
        age: Int
        birthday: String!
        greeting(myName: String): String
        heightInMeters: Float!
        name: String!
      }

      input GiraffeInput {
        birthday: String
        heightInMeters: Float
        name: String
      }

      type Mutation {
        createGiraffe(data: GiraffeInput): Giraffe
        saveGiraffe(birthday: String, heightInMeters: Float, name: String): Giraffe
        updateGiraffe(data: GiraffeInput): Giraffe
      }

      type Query {
        giraffe(name: String): Giraffe
      }"
    `)
  })

  it("should avoid duplicate name", () => {
    const Dog1 = silk<{ name: string }>(
      new GraphQLObjectType({
        name: "Dog",
        fields: {
          name: { type: new GraphQLNonNull(GraphQLString) },
        },
      })
    )
    const Dog2 = silk<{ name: string }>(
      new GraphQLObjectType({
        name: "Dog",
        fields: {
          name: { type: new GraphQLNonNull(GraphQLString) },
        },
      })
    )

    const dogResolver = resolver({
      dog1: query(silk(GraphQLString), {
        input: { dog: Dog1 },
        resolve: ({ dog }) => dog.name,
      }),
      dog2: query(silk(GraphQLString), {
        input: { dog: Dog2 },
        resolve: ({ dog }) => dog.name,
      }),
    })

    expect(() => {
      new SchemaWeaver().add(dogResolver).weaveGraphQLSchema()
    }).toThrowErrorMatchingInlineSnapshot(
      `[Error: Schema must contain uniquely named types but contains multiple types named "Dog".]`
    )
  })

  it("should work with unique object", () => {
    const Dog1 = silk<{ name: string }>(
      new GraphQLObjectType({
        name: "Dog",
        fields: {
          name: { type: new GraphQLNonNull(GraphQLString) },
        },
      })
    )

    const dogResolver = resolver({
      dog1: query(silk(GraphQLString), {
        input: { dog: Dog1 },
        resolve: ({ dog }) => dog.name,
      }),
      dog2: query(silk(GraphQLString), {
        input: { dog: Dog1 },
        resolve: ({ dog }) => dog.name,
      }),
    })

    expect(
      printSchema(new SchemaWeaver().add(dogResolver).weaveGraphQLSchema())
    ).toMatchInlineSnapshot(`
      "type Query {
        dog1(dog: Dog): String
        dog2(dog: Dog): String
      }

      input Dog {
        name: String!
      }"
    `)
  })

  it("should merge field from multiple resolver", () => {
    const Dog = silk<{ name: string; birthday: string }>(
      new GraphQLObjectType({
        name: "Dog",
        fields: {
          name: { type: new GraphQLNonNull(GraphQLString) },
          birthday: { type: new GraphQLNonNull(GraphQLString) },
        },
      })
    )
    const r1 = resolver.of(Dog, {
      dog: query(Dog, () => {
        return {
          name: "dog1",
          birthday: "2020-01-01",
        }
      }),
      age: field(silk(GraphQLInt), (dog) => {
        return new Date().getFullYear() - new Date(dog.birthday).getFullYear()
      }),
    })

    const r2 = resolver.of(Dog, {
      greeting: field(silk(GraphQLString), (dog) => {
        return `Hello ${dog.name}`
      }),
    })

    const schema = new SchemaWeaver().add(r1).add(r2).weaveGraphQLSchema()
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type Query {
        dog: Dog
      }

      type Dog {
        name: String!
        birthday: String!
        age: Int
        greeting: String
      }"
    `)
  })
})
