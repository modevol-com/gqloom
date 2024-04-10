import { describe, expect, it } from "vitest"
import { date, number, object, string, boolean } from "yup"
import { field, mutation, query, resolver, yupSilk } from "./index"
import {
  GraphQLString,
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInt,
  GraphQLNonNull,
  printType,
  type GraphQLObjectType,
} from "graphql"

describe("YupSilk", () => {
  it("should handle Scalar", () => {
    expect(yupSilk(string()).getType()).toEqual(GraphQLString)
    expect(yupSilk(boolean()).getType()).toEqual(GraphQLBoolean)
    expect(yupSilk(number()).getType()).toEqual(GraphQLFloat)
    expect(yupSilk(number().integer()).getType()).toEqual(GraphQLInt)
  })

  it("should handle non null Scalar", () => {
    const s = yupSilk(string().required()).getType()
    expect(s).toBeInstanceOf(GraphQLNonNull)
    expect(s).toMatchObject({ ofType: GraphQLString })

    const b = yupSilk(boolean().required()).getType()
    expect(b).toBeInstanceOf(GraphQLNonNull)
    expect(b).toMatchObject({ ofType: GraphQLBoolean })

    const f = yupSilk(number().required()).getType()
    expect(f).toBeInstanceOf(GraphQLNonNull)
    expect(f).toMatchObject({ ofType: GraphQLFloat })

    const i = yupSilk(number().required().integer()).getType()
    expect(i).toBeInstanceOf(GraphQLNonNull)
    expect(i).toMatchObject({ ofType: GraphQLInt })
  })

  it("should handle Object", () => {
    const Giraffe = object({
      name: string().required(),
      birthday: date().required(),
      heightInMeters: number(),
    }).label("Giraffe")

    expect(printType(yupSilk(Giraffe).getType() as GraphQLObjectType))
      .toMatchInlineSnapshot(`
      "type Giraffe {
        name: String!
        birthday: String!
        heightInMeters: Float!
      }"
    `)
  })
})

describe.skip("yup resolver", () => {
  const Giraffe = object({
    name: string().required(),
    birthday: date().required(),
    heightInMeters: number().required(),
  })

  const GiraffeInput = object().concat(Giraffe).partial()

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

  giraffeResolver.giraffe.resolve({ name: "Giraffe" })
  simpleGiraffeResolver.createGiraffe.resolve({})
})
