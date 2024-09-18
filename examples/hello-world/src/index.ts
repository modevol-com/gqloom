import { loom, silk, weave } from "@gqloom/core"
import {
  GraphQLInt,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from "graphql"
import { createServer } from "node:http"
import { createYoga } from "graphql-yoga"

const { resolver, query, mutation, field } = loom

interface ICat {
  name: string
  birthDate: string
}

const Cat = silk<ICat>(
  new GraphQLObjectType({
    name: "Cat",
    fields: {
      name: { type: GraphQLString },
      birthDate: { type: GraphQLString },
    },
  })
)

const catMap = new Map<string, ICat>([
  ["Tom", { name: "Tom", birthDate: "2023-03-03" }],
])

const CatResolver = resolver.of(Cat, {
  age: field(silk(GraphQLInt), (cat) => {
    const birthDate = new Date(cat.birthDate)
    return new Date().getFullYear() - birthDate.getFullYear()
  }),

  hello: query(
    silk<string>(new GraphQLNonNull(GraphQLString)),
    () => "hello, World"
  ),

  cat: query(silk.nullable(Cat), {
    input: { name: silk<string>(new GraphQLNonNull(GraphQLString)) },
    resolve: ({ name }) => {
      return catMap.get(name)
    },
  }),

  cats: query(silk.list(Cat), () => Array.from(catMap.values())),

  createCat: mutation(Cat, {
    input: {
      name: silk<string>(new GraphQLNonNull(GraphQLString)),
      birthDate: silk<string>(new GraphQLNonNull(GraphQLString)),
    },
    resolve: ({ name, birthDate }) => {
      const cat = { name, birthDate }
      catMap.set(cat.name, cat)
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
