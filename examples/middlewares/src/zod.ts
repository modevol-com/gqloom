import { weave, resolver, query } from "@gqloom/zod"
import { z } from "zod"
import { createServer } from "node:http"
import { createYoga } from "graphql-yoga"
import { outputValidator, ZodExceptionFilter } from "./middlewares"

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
  // eslint-disable-next-line no-console
  console.info("Server is running on http://localhost:4000/graphql")
})
