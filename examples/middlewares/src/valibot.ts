import { weave, resolver, query } from "@gqloom/valibot"
import * as v from "valibot"
import { createServer } from "node:http"
import { createYoga } from "graphql-yoga"
import { outputValidator, ValibotExceptionFilter } from "./middlewares"

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
  // eslint-disable-next-line no-console
  console.info("Server is running on http://localhost:4000/graphql")
})
