// resolvers/index.ts
import { query, resolver } from "@gqloom/core"
import { z } from "zod"

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

export const resolvers = [helloResolver]
