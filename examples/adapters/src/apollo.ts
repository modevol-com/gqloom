import { weave } from "@gqloom/core"
import { ApolloServer } from "@apollo/server"
import { startStandaloneServer } from "@apollo/server/standalone"
import { HelloResolver } from "./resolvers"

const schema = weave(HelloResolver)
const server = new ApolloServer({ schema })

startStandaloneServer(server, {
  listen: { port: 4000 },
}).then(({ url }) => {
  console.info(`🚀  Server ready at: ${url}`)
})
