import { mutation, query, resolver } from "@gqloom/core"
import { drizzleResolverFactory } from "@gqloom/drizzle"
import * as v from "valibot"
import { useCurrentUser } from "../contexts"
import { db } from "../providers"
import { users } from "../schema"

const userResolverFactory = drizzleResolverFactory(db, "users")

export const userResolver = resolver.of(users, {
  cats: userResolverFactory.relationField("cats"),

  mine: query(users).resolve(() => useCurrentUser()),

  usersByName: query(users.$list())
    .input({ name: v.string() })
    .resolve(({ name }) => db.query.users.findMany({ where: { name } })),

  userByPhone: query(users.$nullable())
    .input({ phone: v.string() })
    .resolve(({ phone }) => db.query.users.findFirst({ where: { phone } })),

  createUser: mutation(users)
    .input({
      data: v.object({
        name: v.string(),
        phone: v.string(),
      }),
    })
    .resolve(async ({ data }) => {
      const [user] = await db.insert(users).values(data).returning()
      return user
    }),
})
