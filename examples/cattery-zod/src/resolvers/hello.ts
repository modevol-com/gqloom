import { query } from "@gqloom/core"
import { resolver } from "@gqloom/core"
import { z } from "zod"

export const helloResolver = resolver({
  hello: query(z.string())
    .input({
      name: z
        .string()
        .nullish()
        .transform((x) => x ?? "World"),
    })
    .resolve(({ name }) => `Hello ${name}!`),
})
