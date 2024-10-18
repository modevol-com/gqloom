import { resolver, query, weave } from "@gqloom/valibot"
import * as v from "valibot"
import { createServer } from "node:http"
import { createYoga } from "graphql-yoga"
import * as p from "./generated/gqloom"
import { printSchema } from "graphql"
import * as fs from "fs"
import * as path from "path"
import { PrismaClient } from "@prisma/client"
import { PrismaModelBobbin } from "@gqloom/prisma"

const db = new PrismaClient({ log: ["query"] })

const helloResolver = resolver({
  hello: query(v.string(), () => "Hello, World"),
})

const userResolver = new PrismaModelBobbin(p.User, db).resolver()
const postResolver = new PrismaModelBobbin(p.Post, db).resolver()

const schema = weave(helloResolver, userResolver, postResolver)
fs.writeFileSync(path.join(__dirname, "../schema.graphql"), printSchema(schema))

const yoga = createYoga({ schema })
const server = createServer(yoga)
server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
