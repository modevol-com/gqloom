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
} from "valibot"
import { assertType, describe, expect, expectTypeOf, it } from "vitest"
import { field, mutation, query, resolver } from "../src"

describe("valibot resolver", () => {
  const Giraffe = object({
    name: pipe(string(), minLength(3)),
    birthday: date(),
    heightInMeters: number(),
  })

  const GiraffeInput = partial(Giraffe)

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

  it("should throw for invalid input", async () => {
    expect(
      simpleGiraffeResolver.createGiraffe.resolve({
        name: "2",
        birthday: new Date("2022-2-22"),
      })
    ).rejects.toThrow("Invalid length")
  })
})
