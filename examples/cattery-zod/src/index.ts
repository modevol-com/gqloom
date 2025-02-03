import { createServer } from "node:http"
import { ZodWeaver, field, mutation, query, resolver, weave } from "@gqloom/zod"
import { createYoga } from "graphql-yoga"
import { z } from "zod"

const Cat = z.object({
  __typename: z.literal("Cat").nullish(),
  name: z.string(),
  birthDate: z.string(),
})

interface ICat extends z.infer<typeof Cat> {}

const catMap = new Map<string, ICat>([
  ["Tom", { name: "Tom", birthDate: "2023-03-03" }],
])

const catResolver = resolver.of(Cat, {
  age: field(z.number().int(), {
    input: {
      year: z
        .number()
        .int()
        .nullish()
        .transform((value) => value ?? new Date().getFullYear()),
    },
    resolve: (cat, { year }) => {
      const birthDate = new Date(cat.birthDate)
      return year - birthDate.getFullYear()
    },
  }),

  cats: query(z.array(Cat), () => Array.from(catMap.values())),

  cat: query(Cat.nullish(), {
    input: {
      name: z.string(),
    },
    resolve: ({ name }) => catMap.get(name),
  }),

  createCat: mutation(Cat, {
    input: {
      name: z.string(),
      birthDate: z.string(),
    },
    resolve: ({ name, birthDate }) => {
      const cat = { name, birthDate }
      catMap.set(name, cat)
      return cat
    },
  }),
})

const helloResolver = resolver({
  hello: query
    .input(z.object({ name: z.string().nullish() }))
    .output(z.string())
    .resolve(({ name }) => `Hello, ${name ?? "World"}!`),
})

export const schema = weave(ZodWeaver, helloResolver, catResolver)

const yoga = createYoga({ schema })
createServer(yoga).listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
