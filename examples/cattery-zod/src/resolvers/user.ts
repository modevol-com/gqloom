import { mutation, query, resolver } from "@gqloom/core"
import { drizzleResolverFactory } from "@gqloom/drizzle"
import * as z from "zod"
import { useCurrentUser } from "../contexts"
import { db } from "../providers"
import { users } from "../schema"
import { userService } from "../services"

const userResolverFactory = drizzleResolverFactory(db, "users")

export const userResolver = resolver.of(users, {
  cats: userResolverFactory.relationField("cats"),

  mine: query(users).resolve(() => useCurrentUser()),

  usersByName: query(users.$list())
    .input({ name: z.string() })
    .resolve(({ name }) => userService.findUsersByName(name)),

  userByPhone: query(users.$nullable())
    .input({ phone: z.string() })
    .resolve(({ phone }) => userService.findUserByPhone(phone)),

  createUser: mutation(users)
    .input({
      data: z.object({
        name: z.string(),
        phone: z.string(),
      }),
    })
    .resolve(async ({ data }) => userService.createUser(data)),
})
