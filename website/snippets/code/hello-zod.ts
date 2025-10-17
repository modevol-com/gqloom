import { createServer } from "node:http"
import { query, resolver, weave } from "@gqloom/core"
import { ZodWeaver } from "@gqloom/zod"
import { createYoga } from "graphql-yoga"
import * as z from "zod"

const helloResolver = resolver({
  hello: query(z.string())
    .input({
      name: z
        .string()
        .nullish()
        .transform((value) => value ?? "World"),
    })
    .resolve(({ name }) => `Hello, ${name}!`),
})

const schema = weave(ZodWeaver, helloResolver)

const yoga = createYoga({ schema })
const server = createServer(yoga)
server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
