// @paths: {"src/*": ["snippets/home/mikro/*"]}
import { createServer } from "node:http"
import { weave } from "@gqloom/core"
import { MikroResolverFactory } from "@gqloom/mikro-orm"
import { MikroORM } from "@mikro-orm/postgresql"
import { createYoga } from "graphql-yoga"
import { Post, User } from "./entities"

const ormPromise = MikroORM.init({
  dbName: "gqloom",
  entities: [User, Post],
  clientUrl: process.env.DATABASE_URL!,
})

const userResolverFactory = new MikroResolverFactory(User, () =>
  ormPromise.then((orm) => orm.em.fork())
)

const userResolver = userResolverFactory.resolver()

const postResolverFactory = new MikroResolverFactory(Post, () =>
  ormPromise.then((orm) => orm.em.fork())
)

const postResolver = postResolverFactory.resolver()

const schema = weave(userResolver, postResolver)

const yoga = createYoga({ schema })
const server = createServer(yoga)
server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
