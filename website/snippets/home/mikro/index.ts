// @paths: {"src/*": ["snippets/home/mikro/*"]}
import { createServer } from "node:http"
import { resolver, weave } from "@gqloom/core"
import { MikroResolverFactory } from "@gqloom/mikro-orm"
import { MikroORM } from "@mikro-orm/postgresql"
import { createYoga } from "graphql-yoga"
import { Post, User } from "src/entities"

const ormPromise = MikroORM.init({
  dbName: "gqloom",
  entities: [User, Post],
  clientUrl: process.env.DATABASE_URL!,
})

const userResolverFactory = new MikroResolverFactory(User, () =>
  ormPromise.then((orm) => orm.em.fork())
)

const userResolver = resolver.of(User, {
  user: userResolverFactory.findOneQuery(),
  users: userResolverFactory.findManyQuery(),
  createUser: userResolverFactory.createMutation(),
  updateUser: userResolverFactory.updateMutation(),
  deleteUser: userResolverFactory.deleteOneMutation(),
})

const postResolverFactory = new MikroResolverFactory(Post, () =>
  ormPromise.then((orm) => orm.em.fork())
)

const postResolver = resolver.of(Post, {
  post: postResolverFactory.findOneQuery(),
  posts: postResolverFactory.findManyQuery(),
  createPost: postResolverFactory.createMutation(),
  updatePost: postResolverFactory.updateMutation(),
  deletePost: postResolverFactory.deleteOneMutation(),
})

const schema = weave(userResolver, postResolver)

const yoga = createYoga({ schema })
const server = createServer(yoga)
server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
