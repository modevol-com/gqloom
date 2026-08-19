// @paths: {"src/*": ["snippets/home/mikro/*"]}
import { field, query, resolver } from "@gqloom/core"
import { Post, User } from "src/entities"
import * as v from "valibot"

export const userResolver = resolver.of(User, {
  user: query(User.nullable()) // Declare a query that returns a user
    .input({ id: v.number() }) // This query accepts an `id` as parameter
    .resolve(async ({ id }) => {
      const em = await useEm()
      return await em.findOne(User, id)
    }),

  posts: field(Post.list()) // Declare a derived field that returns a list of posts
    .derivedFrom("posts") // This field depends on the `posts` field
    .resolve(async (user) => {
      return await user.posts.loadItems({ dataloader: true })
    }),
})

// ---cut-after---
import { createMemoization } from "@gqloom/core/context"
import { MikroORM } from "@mikro-orm/libsql"

const ormPromise = MikroORM.init({
  dbName: ":memory:",
  entities: [User, Post],
})
const useEm = createMemoization(async () => (await ormPromise).em.fork())
