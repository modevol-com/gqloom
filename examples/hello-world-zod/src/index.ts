import { weave, resolver, query } from "@gqloom/zod"
import { z } from "zod"
import { createServer } from "node:http"
import { createYoga } from "graphql-yoga"

const Cat = z.object({
  __typename: z.literal("Cat").nullish(),
  name: z.string(),
  birthDate: z.string(),
})

interface ICat extends z.infer<typeof Cat> {}

const CatResolver = resolver({
  hello: query(z.string(), () => "Hello, World"),
})

export const schema = weave(CatResolver)

const yoga = createYoga({ schema })
createServer(yoga).listen(4000, () => {
  // eslint-disable-next-line no-console
  console.info("Server is running on http://localhost:4000/graphql")
})
