import { weave, resolver, query, mutation } from "@gqloom/zod"
import { z } from "zod"
import { createServer } from "node:http"
import { createYoga } from "graphql-yoga"

const Cat = z.object({
  __typename: z.literal("Cat").nullish(),
  name: z.string(),
  birthDate: z.string(),
})

interface ICat extends z.infer<typeof Cat> {}

const catMap = new Map<string, ICat>([
  ["Tom", { name: "Tom", birthDate: "2023-03-03" }],
])

const CatResolver = resolver({
  hello: query(z.string(), () => "Hello, World"),

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

export const schema = weave(CatResolver)

const yoga = createYoga({ schema })
createServer(yoga).listen(4000, () => {
  // eslint-disable-next-line no-console
  console.info("Server is running on http://localhost:4000/graphql")
})
