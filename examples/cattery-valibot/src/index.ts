import { createServer } from "node:http"
import { type Middleware, weave } from "@gqloom/core"
import { ValibotWeaver } from "@gqloom/valibot"
import { GraphQLDateTime, GraphQLJSONObject } from "graphql-scalars"
import { createYoga } from "graphql-yoga"
import { resolvers } from "./resolvers"

const exceptionFilter: Middleware = async (next) => {
  try {
    return await next()
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: log error
    console.error(error)
    if (error instanceof Error) {
      throw new GraphQLError(error.message)
    }
    throw new GraphQLError("There has been something wrong...")
  }
}

const schema = weave(
  ValibotWeaver,
  ...resolvers,
  exceptionFilter,
  DrizzleWeaver.config({
    presetGraphQLType(column) {
      if (column.dataType === "date") {
        return GraphQLDateTime
      }
      if (column.dataType === "json") {
        return GraphQLJSONObject
      }
    },
  })
)

const yoga = createYoga({ schema })
createServer(yoga).listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})

import * as fs from "fs"
import * as path from "path"
import { DrizzleWeaver } from "@gqloom/drizzle"
import { GraphQLError, printSchema } from "graphql"
if (process.env.NODE_ENV !== "production") {
  fs.writeFileSync(
    path.resolve(__dirname, "../schema.graphql"),
    printSchema(schema)
  )
}
