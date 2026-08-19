import { createServer } from "node:http"
import { query, resolver, weave } from "@gqloom/core"
import { YupWeaver } from "@gqloom/yup"
import { createYoga } from "graphql-yoga"
import { string } from "yup"

const helloResolver = resolver({
  hello: query(string().required())
    .input({ name: string().default("World") })
    .resolve(({ name }) => `Hello, ${name}!`),
})

const schema = weave(YupWeaver, helloResolver)

const yoga = createYoga({ schema })
const server = createServer(yoga)
server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
