import { field, query, resolver } from "@gqloom/core"
import { MikroResolverFactory } from "@gqloom/mikro-orm"
import * as v from "valibot"
import { Post, User } from "./entities"
import { useEm, useSelectedFields } from "./provider"

const userFactory = new MikroResolverFactory(User, {
  getEntityManager: useEm,
  input: {
    email: v.pipe(v.string(), v.email()),
    password: {
      filters: field.hidden,
      create: v.pipe(v.string(), v.minLength(6)),
      update: v.pipe(v.string(), v.minLength(6)),
    },
  },
})

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

  posts: userFactory.collectionField("posts"),
})

const postFactory = new MikroResolverFactory(Post, useEm)

export const postResolver = postFactory.resolver()
