import { query, resolver } from "@gqloom/core"
import * as v from "valibot"
import { catResolver } from "./cat"
import { userResolver } from "./user"

const helloResolver = resolver({
  hello: query(v.string())
    .input({ name: v.nullish(v.string(), "World") })
    .resolve(({ name }) => `Hello ${name}!`),
})

export const resolvers = [helloResolver, userResolver, catResolver]
