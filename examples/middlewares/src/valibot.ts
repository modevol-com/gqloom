import { createServer } from "node:http"
import { ValibotWeaver, query, resolver, weave } from "@gqloom/valibot"
import { createYoga } from "graphql-yoga"
import * as v from "valibot"
import { ValibotExceptionFilter, outputValidator } from "./middlewares"

const helloResolver = resolver({
  hello: query(v.pipe(v.string(), v.minLength(10)))
    .input({ name: v.string() })
    .use(outputValidator)
    .resolve(({ name }) => `Hello, ${name}`),
})

export const schema = weave(
  ValibotWeaver,
  helloResolver,
  ValibotExceptionFilter
)

const yoga = createYoga({ schema })
createServer(yoga).listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
