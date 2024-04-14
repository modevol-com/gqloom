import { describe } from "vitest"
import { z } from "zod"
import { field, mutation, query, resolver } from "../src/index"

describe.todo("zod resolver", () => {
  const Giraffe = z.object({
    name: z.string(),
    birthday: z.date(),
    heightInMeters: z.number(),
  })

  const GiraffeInput = Giraffe.partial()

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

  giraffeResolver.giraffe.resolve({ name: "Giraffe" })
  simpleGiraffeResolver.createGiraffe.input
})
