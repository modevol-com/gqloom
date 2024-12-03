import { createServer } from "node:http"
import {
  ValibotWeaver,
  query,
  resolver,
  subscription,
  weave,
} from "@gqloom/valibot"
import { createPubSub, createYoga } from "graphql-yoga"
import * as v from "valibot"

const CountdownResolver = resolver({
  countdown: subscription(v.number(), {
    input: { seconds: v.pipe(v.number(), v.integer()) },
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
  hello: query(v.string(), {
    input: { name: v.string() },
    resolve: ({ name }) => {
      const hello = `Hello, ${name}`
      pubSub.publish("greeting", hello)
      return hello
    },
  }),

  listenGreeting: subscription(v.string(), {
    subscribe: () => pubSub.subscribe("greeting"),
    resolve: (payload) => payload,
  }),
})

const schema = weave(ValibotWeaver, CountdownResolver, HelloResolver)
const yoga = createYoga({ schema })
const server = createServer(yoga)

server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
