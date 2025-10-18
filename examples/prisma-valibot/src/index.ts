import * as fs from "node:fs"
import { createServer } from "node:http"
import path from "node:path"
import { weave } from "@gqloom/core"
import { PrismaWeaver } from "@gqloom/prisma"
import { ValibotWeaver } from "@gqloom/valibot"
import { lexicographicSortSchema, printSchema } from "graphql"
import { GraphQLDateTime } from "graphql-scalars"
import { createYoga } from "graphql-yoga"
import { postQueriesResolver, postResolver } from "./resolvers/post"
import { userQueriesResolver, userResolver } from "./resolvers/user"

const schema = weave(
  ValibotWeaver,
  PrismaWeaver.config({
    presetGraphQLType: (type) => {
      switch (type) {
        case "DateTime":
          return GraphQLDateTime
      }
    },
  }),
  userResolver,
  userQueriesResolver,
  postResolver,
  postQueriesResolver
)
fs.writeFileSync(
  path.join(import.meta.dirname, "../schema.graphql"),
  printSchema(lexicographicSortSchema(schema))
)

const yoga = createYoga({
  graphqlEndpoint: "/",
  graphiql: {
    defaultQuery: /* GraphQL */ `
    query {
      findManyUser {
        id
        name
        email
      }
    }
  `,
  },
  schema,
})
const server = createServer(yoga)
server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000")
})
