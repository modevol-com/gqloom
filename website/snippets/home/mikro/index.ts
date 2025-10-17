// @paths: {"src/*": ["snippets/home/mikro/*"]}
import { createServer } from "node:http"
import { weave } from "@gqloom/core"
import { createMemoization } from "@gqloom/core/context"
import { MikroResolverFactory } from "@gqloom/mikro-orm"
import { MikroORM } from "@mikro-orm/libsql"
import { createYoga } from "graphql-yoga"
import { Post, User } from "src/entities"

const ormPromise = MikroORM.init({
  dbName: ":memory:",
  entities: [User, Post],
})
const useEm = createMemoization(async () => (await ormPromise).em.fork())

const userResolver = new MikroResolverFactory(User, useEm).resolver()
const postResolver = new MikroResolverFactory(Post, useEm).resolver()

const schema = weave(userResolver, postResolver)

const yoga = createYoga({ schema })
const server = createServer(yoga)
server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})

// ---cut-after---
import fs from "node:fs"
import path from "node:path"
import { lexicographicSortSchema, printSchema } from "graphql"

fs.writeFileSync(
  path.join(import.meta.dirname, "schema.graphql"),
  printSchema(lexicographicSortSchema(schema))
)
