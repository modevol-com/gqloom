import { createServer } from "node:http"
import { field, mutation, query, resolver, weave } from "@gqloom/core"
import { ValibotWeaver } from "@gqloom/valibot"
import { createYoga } from "graphql-yoga"
import * as v from "valibot"

const Cat = v.object({
  __typename: v.nullish(v.literal("Cat")),
  name: v.string(),
  birthDate: v.string(),
})

interface ICat extends v.InferOutput<typeof Cat> {}

const catMap = new Map<string, ICat>([
  ["Tom", { name: "Tom", birthDate: "2023-03-03" }],
])

const CatResolver = resolver.of(Cat, {
  age: field(v.pipe(v.number(), v.integer()), {
    input: {
      year: v.nullish(v.pipe(v.number(), v.integer()), () =>
        new Date().getFullYear()
      ),
    },
    resolve: (cat, { year }) => {
      const birthDate = new Date(cat.birthDate)
      return year - birthDate.getFullYear()
    },
  }),

  cats: query(v.array(Cat), () => Array.from(catMap.values())),

  cat: query(v.nullish(Cat), {
    input: {
      name: v.string(),
    },
    resolve: ({ name }) => catMap.get(name),
  }),

  createCat: mutation(Cat, {
    input: {
      name: v.string(),
      birthDate: v.string(),
    },
    resolve: ({ name, birthDate }) => {
      const cat = { name, birthDate }
      catMap.set(name, cat)
      return cat
    },
  }),
})

const HelloResolver = resolver({
  hello: query(v.string(), () => "Hello, World"),
})

export const schema = weave(ValibotWeaver, HelloResolver, CatResolver)

const yoga = createYoga({ schema })
createServer(yoga).listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
