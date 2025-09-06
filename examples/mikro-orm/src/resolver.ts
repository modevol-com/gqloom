import { field, query, resolver } from "@gqloom/core"
import { MikroResolverFactory } from "@gqloom/mikro-orm"
import { useSelectedFields } from "@gqloom/mikro-orm/context"
import * as v from "valibot"
import { Post, User } from "./entities"
import { useEm } from "./provider"

const userFactory = new MikroResolverFactory(User, useEm)

export const userResolver = resolver.of(User, {
  user: query(User.nullable())
    .input({ id: v.number() })
    .resolve(async ({ id }) => {
      const user = await useEm().findOne(
        User,
        { id },
        { fields: useSelectedFields() }
      )
      return user
    }),

  users: query(User.list()).resolve(() => {
    return useEm().findAll(User, { fields: useSelectedFields() })
  }),

  createUser: userFactory.createMutation(),

  posts: field(Post.list())
    .derivedFrom("id")
    .resolve((user) => {
      return useEm().find(
        Post,
        { author: user.id },
        { fields: useSelectedFields() }
      )
    }),
})

const postFactory = new MikroResolverFactory(Post, useEm)

export const postResolver = postFactory.resolver()
