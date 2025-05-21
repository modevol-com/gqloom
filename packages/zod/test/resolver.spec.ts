import { collectNames, silk, weave } from "@gqloom/core"
import {
  GraphQLInt,
  GraphQLObjectType,
  GraphQLString,
  graphql,
  printSchema,
} from "graphql"
import { assertType, describe, expect, expectTypeOf, it } from "vitest"
import * as z from "zod/v4"
import {
  ZodWeaver,
  asUnionType,
  field,
  mutation,
  query,
  resolver,
} from "../src/index"

describe("zod resolver", () => {
  const Giraffe = z.object({
    name: z.string(),
    birthday: z.date(),
    heightInMeters: z.number(),
  })

  const GiraffeInput = Giraffe.partial()

  collectNames({ Giraffe, GiraffeInput })

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
    age: field(z.number(), async (giraffe) => {
      return new Date().getFullYear() - giraffe.birthday.getFullYear()
    }),

    giraffe: query(Giraffe, {
      input: { name: z.string() },
      resolve: ({ name }) => ({
        name,
        birthday: new Date(),
        heightInMeters: 5,
      }),
    }),

    greeting: field(z.string(), {
      input: { myName: z.string().nullish() },
      resolve: (giraffe, { myName }) =>
        `Hello, ${myName ?? "my friend"}! My Pname is ${giraffe.name}.`,
    }),
  })

  giraffeResolver["~meta"].fields.giraffe["~meta"].resolve({ name: "Giraffe" })

  it("should infer input type", () => {
    expectTypeOf(
      simpleGiraffeResolver["~meta"].fields.createGiraffe["~meta"].resolve
    )
      .parameter(0)
      .toEqualTypeOf<z.input<typeof GiraffeInput>>()
  })

  it("should infer output type", () => {
    expectTypeOf(
      simpleGiraffeResolver["~meta"].fields.createGiraffe["~meta"].resolve
    ).returns.resolves.toEqualTypeOf<z.output<typeof Giraffe>>()
  })

  it("should infer parent type", () => {
    expectTypeOf(giraffeResolver["~meta"].fields.age["~meta"].resolve)
      .parameter(0)
      .toEqualTypeOf<z.output<typeof Giraffe>>()
  })

  it("should resolve mutation", async () => {
    expect(
      await simpleGiraffeResolver["~meta"].fields.createGiraffe[
        "~meta"
      ].resolve({
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
    const Cat = z.object({
      name: z.string(),
      age: z.number().int(),
      loveFish: z.boolean().optional(),
    })

    const Dog = z.object({
      name: z.string(),
      age: z.number().int(),
      loveBone: z.boolean().optional(),
    })
    const Animal = z.union([Cat, Dog]).register(asUnionType, {
      name: "Animal",
      resolveType: (it) => {
        if (it.loveFish) return "Cat"
        return "Dog"
      },
    })

    collectNames({ Cat, Dog, Animal })

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

    const schema = weave(ZodWeaver, animalResolver)

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
      hello: field(z.string(), (horse) => {
        assertType<IHorse>(horse)
        return `Neh! Neh! --${horse.name}`
      }),
      horse: query(Horse, {
        input: { name: z.string() },
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
      const Cat = z.object({
        name: z.string(),
        age: z.number(),
      })

      const animalResolver = resolver({
        cat: query(Cat, () => ({
          name: "Kitty",
          age: 1,
        })),
      })

      const schema = weave(animalResolver, ZodWeaver)
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
      const Cat = z.object({
        name: z.string(),
        age: z.number(),
      })
      const animalResolver = resolver({
        cat: query(Cat, () => ({
          name: "Kitty",
          age: 1,
        })),
        addCat: mutation(Cat, {
          input: z.object({ data: Cat }),
          resolve: ({ data }) => data,
        }),
      })

      const schema = weave(animalResolver, ZodWeaver)

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
