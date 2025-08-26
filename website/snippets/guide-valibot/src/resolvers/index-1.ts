// @paths: {"src/*": ["snippets/guide-zod/src/*"]}
import { query, resolver } from "@gqloom/core"
import { userResolver } from "src/resolvers/user" // [!code ++]
import * as v from "valibot"

const helloResolver = resolver({
  hello: query(v.string())
    .input({ name: v.nullish(v.string(), "World") })
    .resolve(({ name }) => `Hello ${name}!`),
})

export const resolvers = [helloResolver, userResolver] // [!code ++]
