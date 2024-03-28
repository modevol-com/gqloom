import { test } from "vitest"
import { date, number, object, string } from "yup"
import { field, mutation, query, resolver } from "./index"

test("yup resolver", () => {
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
