// @paths: {"src/*": ["snippets/guide-zod/src/*"]}
import { query, resolver } from "@gqloom/core"
import { catResolver } from "src/resolvers/cat" // [!code ++]
import { userResolver } from "src/resolvers/user"
import * as v from "valibot"

const helloResolver = resolver({
  hello: query(v.string())
    .input({ name: v.nullish(v.string(), "World") })
    .resolve(({ name }) => `Hello ${name}!`),
})

export const resolvers = [helloResolver, userResolver, catResolver] // [!code ++]
