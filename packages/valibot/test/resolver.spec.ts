import {
  object,
  string,
  date,
  number,
  partial,
  type InferInput,
  type InferOutput,
  nullish,
  pipe,
  minLength,
  boolean,
  integer,
  optional,
  union,
  variant,
  literal,
} from "valibot"
import { assertType, describe, expect, expectTypeOf, it } from "vitest"
import { field, mutation, query, resolver } from "../src"
import { SchemaWeaver, collectNames, silk, weave } from "@gqloom/core"
import { GraphQLInt, GraphQLObjectType, GraphQLString, graphql } from "graphql"

describe("valibot resolver", () => {
  const Giraffe = object({
    name: pipe(string(), minLength(3)),
    birthday: date(),
    heightInMeters: number(),
  })

  const GiraffeInput = partial(Giraffe)

  const Cat = object({
    name: string(),
    age: pipe(number(), integer()),
    loveFish: optional(boolean()),
  })

  const Dog = object({
    name: string(),
    age: pipe(number(), integer()),
    loveBone: optional(boolean()),
  })

  collectNames({ Cat, Dog }, { Giraffe, GiraffeInput })

  const createGiraffe = mutation(Giraffe, {
    input: GiraffeInput,
    resolve: (input) => {
      assertType<InferInput<typeof GiraffeInput>>(input)
      return {
        name: input.name ?? "Giraffe",
        birthday: input.birthday ?? new Date(),
        heightInMeters: input.heightInMeters ?? 5,
      }
    },
  })

  const simpleGiraffeResolver = resolver({
    createGiraffe,
  })

  const giraffeResolver = resolver.of(Giraffe, {
    age: field(number(), async (giraffe) => {
      assertType<InferOutput<typeof Giraffe>>(giraffe)
      return new Date().getFullYear() - giraffe.birthday.getFullYear()
    }),

    giraffe: query(Giraffe, {
      input: { name: string() },
      resolve: ({ name }) => ({
        name,
        birthday: new Date(),
        heightInMeters: 5,
      }),
    }),

    greeting: field(string(), {
      input: { myName: nullish(string()) },
      resolve: (giraffe, { myName }) =>
        `Hello, ${myName ?? "my friend"}! My Pname is ${giraffe.name}.`,
    }),
  })

  it("should infer input type", () => {
    expectTypeOf(simpleGiraffeResolver.createGiraffe.resolve)
      .parameter(0)
      .toEqualTypeOf<InferInput<typeof GiraffeInput>>()
  })

  it("should infer output type", () => {
    expectTypeOf(
      simpleGiraffeResolver.createGiraffe.resolve
    ).returns.resolves.toEqualTypeOf<InferOutput<typeof Giraffe>>()
  })

  it("should infer parent type", () => {
    expectTypeOf(giraffeResolver.age.resolve)
      .parameter(0)
      .toEqualTypeOf<InferOutput<typeof Giraffe>>()
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
    const Animal = union([Cat, Dog])

    collectNames({ Animal })

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

  it("should resolve variant", async () => {
    const ExplicitCat = object({
      __typename: literal("Cat"),
      ...Cat.entries,
    })

    const ExplicitDog = object({
      __typename: literal("Dog"),
      ...Dog.entries,
    })

    const Animal = variant("__typename", [ExplicitCat, ExplicitDog])
    collectNames({ Cat: ExplicitCat, Dog: ExplicitDog, Animal })

    const animalResolver = resolver({
      cat: query(Animal, () => ({
        __typename: "Cat" as const,
        name: "Kitty",
        age: 1,
      })),

      dog: query(Animal, () => ({
        __typename: "Dog" as const,
        name: "Sadie",
        age: 2,
      })),
    })

    const schema = new SchemaWeaver().add(animalResolver).weaveGraphQLSchema()
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
    expect(result).toMatchObject({
      data: {
        cat: { __typename: "Cat", name: "Kitty", age: 1 },
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
    expect(result).toMatchObject({
      data: {
        dog: { __typename: "Dog", name: "Sadie", age: 2 },
      },
    })
  })

  it("should throw for invalid input", async () => {
    expect(
      simpleGiraffeResolver.createGiraffe.resolve({
        name: "2",
        birthday: new Date("2022-2-22"),
      })
    ).rejects.toThrow("Invalid length")
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
        name: input.name ?? "",
        age: input.age ?? 0,
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
        input: { name: string() },
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
})
