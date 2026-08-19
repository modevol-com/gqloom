import { createServer } from "node:http"
import { query, resolver, weave, ZodWeaver } from "@gqloom/zod"
import { createYoga } from "graphql-yoga"
import * as z from "zod"
import { outputValidator, ZodExceptionFilter } from "./middlewares"

const helloResolver = resolver({
  hello: query(z.string().min(10))
    .input({ name: z.string() })
    .use(outputValidator)
    .resolve(({ name }) => `Hello, ${name}`),
})

export const schema = weave(ZodWeaver, helloResolver, ZodExceptionFilter)

const yoga = createYoga({ schema })
createServer(yoga).listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
