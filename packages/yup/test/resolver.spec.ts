import { collectNames, silk, weave } from "@gqloom/core"
import {
  GraphQLInt,
  GraphQLObjectType,
  GraphQLString,
  graphql,
  printSchema,
} from "graphql"
import { assertType, describe, expect, expectTypeOf, it } from "vitest"
import { type InferType, boolean, date, number, object, string } from "yup"
import { field, mutation, query, resolver, union } from "../src"

describe("yup resolver", () => {
  const Giraffe = object({
    name: string().required(),
    birthday: date().required(),
    heightInMeters: number().required(),
  })

  const GiraffeInput = object().concat(Giraffe).partial()

  const Cat = object({
    name: string(),
    age: number().integer(),
    loveFish: boolean(),
  })

  const Dog = object({
    name: string(),
    age: number().integer(),
    loveBone: boolean(),
  })

  collectNames({ Cat, Dog }, { Giraffe, GiraffeInput })

  const createGiraffe = mutation(Giraffe, {
    input: GiraffeInput,
    resolve: (data) => ({
      name: data.name ?? "Giraffe",
      birthday: data.birthday ?? new Date(),
      heightInMeters: data.heightInMeters ?? 5,
    }),
  })

  const simpleGiraffeResolver = resolver({
    createGiraffe: createGiraffe,
  })

  const giraffeResolver = resolver.of(Giraffe, {
    age: field(number(), async (giraffe) => {
      return new Date().getFullYear() - giraffe.birthday.getFullYear()
    }),

    giraffe: query(Giraffe, {
      input: { name: string().required() },
      resolve: ({ name }) => ({
        name,
        birthday: new Date(),
        heightInMeters: 5,
      }),
    }),

    greeting: field(string(), {
      input: { myName: string() },
      resolve: (giraffe, { myName }) =>
        `Hello, ${myName ?? "my friend"}! My name is ${giraffe.name}.`,
    }),
  })
  it("should infer input type", () => {
    expectTypeOf(simpleGiraffeResolver.createGiraffe.resolve)
      .parameter(0)
      .toEqualTypeOf<InferType<typeof GiraffeInput>>()
  })

  it("should infer output type", () => {
    expectTypeOf(
      simpleGiraffeResolver.createGiraffe.resolve
    ).returns.resolves.toEqualTypeOf<InferType<typeof Giraffe>>()
  })

  it("should infer parent type", () => {
    expectTypeOf(giraffeResolver.age.resolve)
      .parameter(0)
      .toEqualTypeOf<InferType<typeof Giraffe>>()
  })

  it("should resolve mutation", async () => {
    expect(
      await simpleGiraffeResolver.createGiraffe.resolve({
        name: "Giraffe",
        birthday: new Date("2022-2-22"),
      })
    ).toEqual({
      name: "Giraffe",
      birthday: new Date("2022-2-22"),
      heightInMeters: 5,
    })
  })

  it("should resolve query", async () => {
    expect(
      await giraffeResolver.giraffe.resolve({
        name: "Giraffe",
      })
    ).toEqual({
      name: "Giraffe",
      birthday: expect.any(Date),
      heightInMeters: 5,
    })
  })

  it("should resolve field", async () => {
    const giraffe = await giraffeResolver.giraffe.resolve({
      name: "Giraffe",
    })

    expect(await giraffeResolver.age.resolve(giraffe, undefined)).toEqual(
      expect.any(Number)
    )
  })

  it("should resolve union", async () => {
    const Animal = union([Cat, Dog]).meta({
      asUnionType: {
        resolveType: (it) => {
          if (it.loveFish) return "Cat"
          return "Dog"
        },
      },
    })

    collectNames({ Animal, Cat, Dog })

    const animalResolver = resolver({
      cat: query(Animal, () => ({
        name: "Kitty",
        age: 1,
        loveFish: true,
      })),

      dog: query(Animal, () => ({
        name: "Sadie",
        age: 2,
        loveBone: true,
      })),
    })

    const schema = weave(animalResolver)

    let result: any
    result = await graphql({
      schema,
      source: /* GraphQL */ `
        query {
          cat {
            __typename
            ... on Cat {
              name
              age
              loveFish
            }
          }
        }
      `,
    })
    expect(result).toEqual({
      data: {
        cat: { __typename: "Cat", name: "Kitty", age: 1, loveFish: true },
      },
    })

    result = await graphql({
      schema,
      source: /* GraphQL */ `
        query {
          dog {
            __typename
            ... on Dog {
              name
              age
              loveBone
            }
          }
        }
      `,
    })
    expect(result).toEqual({
      data: {
        dog: { __typename: "Dog", name: "Sadie", age: 2, loveBone: true },
      },
    })
  })

  describe("it should handle GraphQLSilk", () => {
    interface IHorse {
      name: string
      age: number
    }

    const Horse = silk<IHorse, Partial<IHorse>>(
      new GraphQLObjectType({
        name: "Horse",
        fields: {
          name: { type: GraphQLString },
          age: { type: GraphQLInt },
        },
      }),
      (input) => ({
        value: {
          name: input.name ?? "",
          age: input.age ?? 0,
        },
      })
    )

    const createHorse = mutation(Horse, {
      input: Horse,
      resolve: (input) => {
        assertType<IHorse>(input)
        return input
      },
    })

    const horseResolver = resolver.of(Horse, {
      createHorse,
      hello: field(string(), (horse) => {
        assertType<IHorse>(horse)
        return `Neh! Neh! --${horse.name}`
      }),
      horse: query(Horse, {
        input: { name: string().required() },
        resolve: ({ name }) => ({
          name,
          age: 1,
        }),
      }),
    })

    it("should infer input type", () => {
      expectTypeOf(horseResolver.createHorse.resolve)
        .parameter(0)
        .toEqualTypeOf<Partial<IHorse>>()
    })

    it("should infer output type", () => {
      expectTypeOf(
        horseResolver.createHorse.resolve
      ).returns.resolves.toEqualTypeOf<IHorse>()
    })

    it("should infer parent type", () => {
      expectTypeOf(horseResolver.hello.resolve)
        .parameter(0)
        .toEqualTypeOf<IHorse>()
    })

    it("should resolve mutation", async () => {
      expect(
        await horseResolver.createHorse.resolve({
          name: "Horse",
          age: 1,
        })
      ).toEqual({
        name: "Horse",
        age: 1,
      })
    })
    it("should resolve query", async () => {
      expect(
        await horseResolver.horse.resolve({
          name: "Horse",
        })
      ).toEqual({
        name: "Horse",
        age: 1,
      })
    })
    it("should resolve field", async () => {
      expect(
        await horseResolver.hello.resolve({ name: "Horse", age: 1 }, undefined)
      ).toEqual("Neh! Neh! --Horse")
    })
  })

  describe("auto naming", () => {
    it("should automatically assign names to objects", async () => {
      const Cat = object({
        name: string(),
        age: number(),
      })

      const animalResolver = resolver({
        cat: query(Cat, () => ({
          name: "Kitty",
          age: 1,
        })),
      })

      const schema = weave(animalResolver)
      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type Query {
          cat: Cat
        }

        type Cat {
          name: String
          age: Float
        }"
      `)
    })

    it("should automatically assign names to inputs", async () => {
      const Cat = object({
        name: string(),
        age: number(),
      })
      const animalResolver = resolver({
        cat: query(Cat, () => ({
          name: "Kitty",
          age: 1,
        })),
        addCat: mutation(Cat, {
          input: object({ data: Cat }),
          resolve: ({ data }) => data,
        }),
      })

      const schema = weave(animalResolver)

      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type Query {
          cat: Cat
        }

        type Cat {
          name: String
          age: Float
        }

        type Mutation {
          addCat(name: String, age: Float): Cat
        }"
      `)
    })
  })
})
