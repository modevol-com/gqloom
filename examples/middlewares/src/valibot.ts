import { createServer } from "node:http"
import { query, resolver, weave } from "@gqloom/valibot"
import { createYoga } from "graphql-yoga"
import * as v from "valibot"
import { ValibotExceptionFilter, outputValidator } from "./middlewares"

const HelloResolver = resolver({
  hello: query(v.pipe(v.string(), v.minLength(10)), {
    input: { name: v.string() },
    resolve: ({ name }) => `Hello, ${name}`,
    middlewares: [outputValidator],
  }),
})

export const schema = weave(HelloResolver, ValibotExceptionFilter)

const yoga = createYoga({ schema })
createServer(yoga).listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
