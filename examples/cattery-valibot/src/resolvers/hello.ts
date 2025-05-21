import { query, resolver } from "@gqloom/core"
import * as v from "valibot"

export const helloResolver = resolver({
  hello: query(v.string())
    .input({ name: v.nullish(v.string(), "World") })
    .resolve(({ name }) => `Hello ${name}!`),
})
