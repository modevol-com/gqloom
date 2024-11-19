import { createServer } from "node:http"
import { query, resolver, subscription, weave } from "@gqloom/zod"
import { createPubSub, createYoga } from "graphql-yoga"
import { z } from "zod"

const CountdownResolver = resolver({
  countdown: subscription(z.number(), {
    input: { seconds: z.number().int() },
    subscribe: async function* (data) {
      for (let i = data.seconds; i >= 0; i--) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        yield i
      }
    },
  }),
})

const pubSub = createPubSub<{ greeting: [string] }>()

const HelloResolver = resolver({
  hello: query(z.string(), {
    input: { name: z.string() },
    resolve: ({ name }) => {
      const hello = `Hello, ${name}`
      pubSub.publish("greeting", hello)
      return hello
    },
  }),

  listenGreeting: subscription(z.string(), {
    subscribe: () => pubSub.subscribe("greeting"),
    resolve: (payload) => payload,
  }),
})

const schema = weave(CountdownResolver, HelloResolver)
const yoga = createYoga({ schema })
const server = createServer(yoga)

server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
