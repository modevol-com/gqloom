import * as fs from "node:fs"
import { createServer } from "node:http"
import * as path from "node:path"
import { weave } from "@gqloom/core"
import { PrismaResolverFactory } from "@gqloom/prisma"
import { PrismaPg } from "@prisma/adapter-pg"
import { printSchema } from "graphql"
import { createYoga } from "graphql-yoga"
import { PrismaClient } from "./generated/client/client"
import { Post, User } from "./generated/gqloom"

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})
const db = new PrismaClient({ adapter })

const userResolver = new PrismaResolverFactory(User, db).resolver()
const postResolver = new PrismaResolverFactory(Post, db).resolver()

const schema = weave(userResolver, postResolver)

fs.writeFileSync(path.join(__dirname, "schema.graphql"), printSchema(schema))

const yoga = createYoga({ schema })
const server = createServer(yoga)
server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
