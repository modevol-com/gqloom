import * as fs from "fs"
import { createServer } from "node:http"
import * as path from "path"
import { query, resolver, weave } from "@gqloom/core"
import { PrismaModelBobbin } from "@gqloom/prisma"
import { ValibotWeaver } from "@gqloom/valibot"
import { PrismaClient } from "@prisma/client"
import { printSchema } from "graphql"
import { createYoga } from "graphql-yoga"
import * as v from "valibot"
import * as p from "./generated/gqloom"

const db = new PrismaClient({ log: ["query"] })

const helloResolver = resolver({
  hello: query(v.string(), () => "Hello, World"),
})

const userResolver = new PrismaModelBobbin(p.User, db).resolver()
const postResolver = new PrismaModelBobbin(p.Post, db).resolver()

const schema = weave(helloResolver, userResolver, postResolver, ValibotWeaver)
fs.writeFileSync(path.join(__dirname, "../schema.graphql"), printSchema(schema))

const yoga = createYoga({ schema })
const server = createServer(yoga)
server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
