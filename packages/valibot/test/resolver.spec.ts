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
} from "valibot"
import { assertType, describe, expect, expectTypeOf, it } from "vitest"
import { field, mutation, query, resolver } from "../src"
import { SchemaWeaver, collectNames } from "@gqloom/core"
import { graphql } from "graphql"

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
    createGiraffe: createGiraffe,
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

  it("should infer output type", () => {
    expectTypeOf(
      simpleGiraffeResolver.createGiraffe.resolve
    ).returns.resolves.toEqualTypeOf<InferOutput<typeof Giraffe>>()
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

  it("should throw for invalid input", async () => {
    expect(
      simpleGiraffeResolver.createGiraffe.resolve({
        name: "2",
        birthday: new Date("2022-2-22"),
      })
    ).rejects.toThrow("Invalid length")
  })
})
