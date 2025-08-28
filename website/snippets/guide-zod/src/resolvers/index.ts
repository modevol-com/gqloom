// @paths: {"src/*": ["snippets/guide-zod/src/*"]}
import { query, resolver } from "@gqloom/core"
import { catResolver } from "src/resolvers/cat" // [!code ++]
import { userResolver } from "src/resolvers/user"
import * as z from "zod"

const helloResolver = resolver({
  hello: query(z.string())
    .input({
      name: z
        .string()
        .nullish()
        .transform((x) => x ?? "World"),
    })
    .resolve(({ name }) => `Hello ${name}!`),
})

export const resolvers = [helloResolver, userResolver, catResolver] // [!code ++]
