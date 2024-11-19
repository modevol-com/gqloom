import { createServer } from "node:http"
import { query, resolver, weave } from "@gqloom/zod"
import { createYoga } from "graphql-yoga"
import { z } from "zod"
import { ZodExceptionFilter, outputValidator } from "./middlewares"

const HelloResolver = resolver({
  hello: query(z.string().min(10), {
    input: { name: z.string() },
    resolve: ({ name }) => `Hello, ${name}`,
    middlewares: [outputValidator],
  }),
})

export const schema = weave(HelloResolver, ZodExceptionFilter)

const yoga = createYoga({ schema })
createServer(yoga).listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
