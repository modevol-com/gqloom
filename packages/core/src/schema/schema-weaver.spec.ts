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
              data: { type: GiraffeInput.getType({}) },
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
      .addResolver(simpleResolver)
      .addResolver(simpleFieldResolver)
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
})
