import * as fs from "node:fs"
import { createServer } from "node:http"
import * as path from "node:path"
import { weave } from "@gqloom/core"
import { drizzleResolverFactory } from "@gqloom/drizzle"
import { drizzle } from "drizzle-orm/node-postgres"
import { printSchema } from "graphql"
import { createYoga } from "graphql-yoga"
import { config } from "../env.config"
import * as tables from "./schema"

const db = drizzle(config.databaseUrl, { schema: tables })

const userResolver = drizzleResolverFactory(db, "users").resolver()
const postResolver = drizzleResolverFactory(db, "posts").resolver()

const schema = weave(userResolver, postResolver)

fs.writeFileSync(path.join(__dirname, "../schema.graphql"), printSchema(schema))

const yoga = createYoga({ schema })
const server = createServer(yoga)
server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
