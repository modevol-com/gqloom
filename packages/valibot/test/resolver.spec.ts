import {
  collectNames,
  field,
  mutation,
  query,
  resolver,
  silk,
  weave,
} from "@gqloom/core"
import {
  GraphQLInt,
  GraphQLObjectType,
  GraphQLString,
  graphql,
  printSchema,
} from "graphql"
import * as v from "valibot"
import { assertType, describe, expect, expectTypeOf, it } from "vitest"
import { ValibotWeaver, asUnionType } from "../src"

describe("valibot resolver", () => {
  const Giraffe = v.object({
    name: v.pipe(v.string(), v.minLength(3)),
    birthday: v.date(),
    heightInMeters: v.number(),
  })

  const GiraffeInput = v.partial(Giraffe)

  const Cat = v.object({
    name: v.string(),
    age: v.pipe(v.number(), v.integer()),
    loveFish: v.optional(v.boolean()),
  })

  const Dog = v.object({
    name: v.string(),
    age: v.pipe(v.number(), v.integer()),
    loveBone: v.optional(v.boolean()),
  })

  collectNames({ Cat, Dog }, { Giraffe, GiraffeInput })

  const createGiraffe = mutation(Giraffe, {
    input: GiraffeInput,
    resolve: (input) => {
      assertType<v.InferInput<typeof GiraffeInput>>(input)
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
    age: field(v.number(), async (giraffe) => {
      assertType<v.InferOutput<typeof Giraffe>>(giraffe)
      return new Date().getFullYear() - giraffe.birthday.getFullYear()
    }),

    giraffe: query(Giraffe, {
      input: { name: v.string() },
      resolve: ({ name }) => ({
        name,
        birthday: new Date(),
        heightInMeters: 5,
      }),
    }),

    greeting: field(v.string(), {
      input: { myName: v.nullish(v.string()) },
      resolve: (giraffe, { myName }) =>
        `Hello, ${myName ?? "my friend"}! My Pname is ${giraffe.name}.`,
    }),
  })

  it("should infer input type", () => {
    expectTypeOf(
      simpleGiraffeResolver["~meta"].fields.createGiraffe["~meta"].resolve
    )
      .parameter(0)
      .toEqualTypeOf<v.InferInput<typeof GiraffeInput>>()
  })

  it("should infer output type", () => {
    expectTypeOf(
      simpleGiraffeResolver["~meta"].fields.createGiraffe["~meta"].resolve
    ).returns.resolves.toEqualTypeOf<v.InferOutput<typeof Giraffe>>()
  })

  it("should infer parent type", () => {
    expectTypeOf(giraffeResolver["~meta"].fields.age["~meta"].resolve)
      .parameter(0)
      .toEqualTypeOf<v.InferOutput<typeof Giraffe>>()
  })

  it("should resolve mutation", async () => {
    const output = await simpleGiraffeResolver["~meta"].fields.createGiraffe[
      "~meta"
    ].resolve({
      name: "Giraffe",
      birthday: new Date("2022-2-22"),
    })
    expect(output).toEqual({
      name: "Giraffe",
      birthday: new Date("2022-2-22"),
      heightInMeters: 5,
    })
  })

  it("should resolve query", async () => {
    expect(
      await giraffeResolver["~meta"].fields.giraffe["~meta"].resolve({
        name: "Giraffe",
      })
    ).toEqual({
      name: "Giraffe",
      birthday: expect.any(Date),
      heightInMeters: 5,
    })
  })

  it("should resolve field", async () => {
    const giraffe = await giraffeResolver["~meta"].fields.giraffe[
      "~meta"
    ].resolve({
      name: "Giraffe",
    })

    expect(
      await giraffeResolver["~meta"].fields.age["~meta"].resolve(
        giraffe,
        undefined
      )
    ).toEqual(expect.any(Number))
  })

  it("should resolve union", async () => {
    const Animal = v.pipe(
      v.union([Cat, Dog]),
      asUnionType({
        resolveType: (value: v.InferOutput<typeof Cat | typeof Dog>) => {
          if ("loveFish" in value) return "Cat"
          if ("loveBone" in value) return "Dog"
        },
      })
    )

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

    const schema = weave(ValibotWeaver, animalResolver)

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
    const ExplicitCat = v.object({
      __typename: v.literal("Cat"),
      ...Cat.entries,
    })

    const ExplicitDog = v.object({
      __typename: v.literal("Dog"),
      ...Dog.entries,
    })

    const Animal = v.variant("__typename", [ExplicitCat, ExplicitDog])
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

    const schema = weave(animalResolver, ValibotWeaver)
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
    const executor = simpleGiraffeResolver.toExecutor()
    await expect(
      executor.createGiraffe({
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
      hello: field(v.string(), (horse) => {
        assertType<IHorse>(horse)
        return `Neh! Neh! --${horse.name}`
      }),
      horse: query(Horse, {
        input: { name: v.string() },
        resolve: ({ name }) => ({
          name,
          age: 1,
        }),
      }),
    })

    it("should infer input type", () => {
      const executor = resolver({ createHorse }).toExecutor()
      expectTypeOf(executor.createHorse)
        .parameter(0)
        .toEqualTypeOf<Partial<IHorse>>()
    })

    it("should infer output type", () => {
      expectTypeOf(
        horseResolver["~meta"].fields.createHorse["~meta"].resolve
      ).returns.resolves.toEqualTypeOf<IHorse>()
    })

    it("should infer parent type", () => {
      expectTypeOf(horseResolver["~meta"].fields.hello["~meta"].resolve)
        .parameter(0)
        .toEqualTypeOf<IHorse>()
    })

    it("should resolve mutation", async () => {
      expect(
        await horseResolver["~meta"].fields.createHorse["~meta"].resolve({
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
        await horseResolver["~meta"].fields.horse["~meta"].resolve({
          name: "Horse",
        })
      ).toEqual({
        name: "Horse",
        age: 1,
      })
    })
    it("should resolve field", async () => {
      expect(
        await horseResolver["~meta"].fields.hello["~meta"].resolve(
          { name: "Horse", age: 1 },
          undefined
        )
      ).toEqual("Neh! Neh! --Horse")
    })
  })

  describe("auto naming", () => {
    it("should automatically assign names to objects", async () => {
      const Cat = v.object({
        name: v.string(),
        age: v.number(),
      })

      const animalResolver = resolver({
        cat: query(Cat, () => ({
          name: "Kitty",
          age: 1,
        })),
      })

      const schema = weave(animalResolver, ValibotWeaver)
      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type Query {
          cat: Cat!
        }

        type Cat {
          name: String!
          age: Float!
        }"
      `)
    })

    it("should automatically assign names to inputs", async () => {
      const Cat = v.object({
        name: v.string(),
        age: v.number(),
      })
      const animalResolver = resolver({
        cat: query(Cat, () => ({
          name: "Kitty",
          age: 1,
        })),
        addCat: mutation(Cat, {
          input: v.object({ data: Cat }),
          resolve: ({ data }) => data,
        }),
      })

      const schema = weave(animalResolver, ValibotWeaver)

      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type Query {
          cat: Cat!
        }

        type Cat {
          name: String!
          age: Float!
        }

        type Mutation {
          addCat(data: AddCatDataInput!): Cat!
        }

        input AddCatDataInput {
          name: String!
          age: Float!
        }"
      `)
    })
  })
})
