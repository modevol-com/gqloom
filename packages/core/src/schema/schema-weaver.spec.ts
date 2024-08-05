import { describe, it, expect } from "vitest"
import {
  GraphQLFloat,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
  printSchema,
  lexicographicSortSchema,
  GraphQLInt,
  GraphQLUnionType,
} from "graphql"
import { getGraphQLType, silk } from "../resolver"
import { loom } from "../resolver"
import { SchemaWeaver, weave } from "./schema-weaver"
import { ensureInterfaceType } from "./interface"
import { provideWeaverContext } from "./weaver-context"

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
              data: { type: getGraphQLType(GiraffeInput) },
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

    const schema2 = weave(simpleResolver, simpleFieldResolver)

    expect(printSchema(lexicographicSortSchema(schema2))).toEqual(
      printSchema(lexicographicSortSchema(schema))
    )

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

  it("should avoid duplicate object", () => {
    const DogType = new GraphQLObjectType({
      name: "Dog",
      fields: {
        name: { type: GraphQLString },
        birthday: { type: GraphQLString },
      },
    })
    const Dog = silk(DogType)

    const d1 = getGraphQLType(Dog)

    expect(d1).toBe(getGraphQLType(Dog))

    const Cat = silk(
      new GraphQLObjectType({
        name: "Cat",
        fields: {
          name: { type: GraphQLString },
          birthday: { type: GraphQLString },
          friend: { type: DogType },
        },
      })
    )

    const r1 = resolver({
      dog: query(Dog, () => ({
        name: "",
        birthday: "2012-12-12",
      })),

      cat: query(Cat, () => ({
        name: "",
        birthday: "2012-12-12",
      })),
    })

    const schema = weave(r1)
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type Query {
        dog: Dog
        cat: Cat
      }

      type Dog {
        name: String
        birthday: String
      }

      type Cat {
        name: String
        birthday: String
        friend: Dog
      }"
    `)
  })

  it("should avoid duplicate object in union", () => {
    const DogType = new GraphQLObjectType({
      name: "Dog",
      fields: {
        name: { type: GraphQLString },
        birthday: { type: GraphQLString },
      },
    })
    const Dog = silk(DogType)

    const d1 = getGraphQLType(Dog)

    expect(d1).toBe(getGraphQLType(Dog))

    const CatType = new GraphQLObjectType({
      name: "Cat",
      fields: {
        name: { type: GraphQLString },
        birthday: { type: GraphQLString },
        friend: { type: DogType },
      },
    })

    const Cat = silk(CatType)

    const Animal = silk(
      new GraphQLUnionType({
        name: "Animal",
        types: [DogType, CatType],
      })
    )

    const r1 = resolver({
      dog: query(Dog, () => ({
        name: "",
        birthday: "2012-12-12",
      })),

      cat: query(Cat, () => ({
        name: "",
        birthday: "2012-12-12",
      })),

      animal: query(Animal, () => ({
        name: "",
        birthday: "2012-12-12",
      })),
    })

    const schema = weave(r1)
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type Query {
        dog: Dog
        cat: Cat
        animal: Animal
      }

      type Dog {
        name: String
        birthday: String
      }

      type Cat {
        name: String
        birthday: String
        friend: Dog
      }

      union Animal = Dog | Cat"
    `)
  })

  it("should avoid duplicate object in interface", () => {
    const weaver = new SchemaWeaver()

    const MasterType = new GraphQLObjectType({
      name: "Master",
      fields: { name: { type: GraphQLString } },
    })

    const AnimalType = new GraphQLObjectType({
      name: "Animal",
      fields: {
        name: { type: GraphQLString },
        master: { type: MasterType },
        birthday: { type: GraphQLString },
      },
    })

    const AnimalInterface = provideWeaverContext(
      () => ensureInterfaceType(AnimalType),
      weaver.context
    )

    const DogType = new GraphQLObjectType({
      name: "Dog",
      fields: {
        name: { type: GraphQLString },
        master: { type: MasterType },
        birthday: { type: GraphQLString },
      },
      interfaces: () => [AnimalInterface],
    })

    const Dog = silk(DogType)

    const r1 = resolver({
      dog: query(Dog, () => ({})),
    })

    const schema = weaver.add(r1).weaveGraphQLSchema()
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type Query {
        dog: Dog
      }

      type Dog implements Animal {
        name: String
        master: Master
        birthday: String
      }

      interface Animal {
        name: String
        master: Master
        birthday: String
      }

      type Master {
        name: String
      }"
    `)
  })
})
