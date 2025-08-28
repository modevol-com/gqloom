import { query, resolver, weave } from "@gqloom/core"
import { ZodWeaver } from "@gqloom/zod"
import * as z from "zod"

const helloResolver = resolver({
  hello: query(z.string())
    .input({ name: z.string().nullish() })
    .resolve(({ name }) => `Hello, ${name ?? "World"}!`),
})

export const schema = weave(ZodWeaver, helloResolver)
