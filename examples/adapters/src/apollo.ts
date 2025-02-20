import { ApolloServer } from "@apollo/server"
import { startStandaloneServer } from "@apollo/server/standalone"
import { weave } from "@gqloom/core"
import { helloResolver } from "./resolvers"

const schema = weave(helloResolver)
const server = new ApolloServer({ schema })

startStandaloneServer(server, {
  listen: { port: 4000 },
}).then(({ url }) => {
  console.info(`🚀  Server ready at: ${url}`)
})
