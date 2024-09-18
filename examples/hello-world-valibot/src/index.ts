import { weave, resolver, query } from "@gqloom/valibot"
import * as v from "valibot"
import { createServer } from "node:http"
import { createYoga } from "graphql-yoga"

const Cat = v.object({
  __typename: v.nullish(v.literal("Cat")),
  name: v.string(),
  birthDate: v.string(),
})

interface ICat extends v.InferOutput<typeof Cat> {}

const CatResolver = resolver({
  hello: query(v.string(), () => "Hello, World"),
})

export const schema = weave(CatResolver)

const yoga = createYoga({ schema })
createServer(yoga).listen(4000, () => {
  // eslint-disable-next-line no-console
  console.info("Server is running on http://localhost:4000/graphql")
})
