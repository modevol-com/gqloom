// @paths: {"src/*": ["snippets/guide-zod/src/*"]}
import { mutation, query, resolver } from "@gqloom/core"
import { drizzleResolverFactory } from "@gqloom/drizzle" // [!code ++]
import { eq } from "drizzle-orm"
import { useCurrentUser } from "src/contexts"
import { db } from "src/providers"
import { users } from "src/schema"
import * as z from "zod"

const userResolverFactory = drizzleResolverFactory(db, users) // [!code ++]

export const userResolver = resolver.of(users, {
  cats: userResolverFactory.relationField("cats"), // [!code ++]

  mine: query(users).resolve(() => useCurrentUser()),

  usersByName: query(users.$list())
    .input({ name: z.string() })
    .resolve(({ name }) => {
      return db.query.users.findMany({
        where: eq(users.name, name),
      })
    }),

  userByPhone: query(users.$nullable())
    .input({ phone: z.string() })
    .resolve(({ phone }) => {
      return db.query.users.findFirst({
        where: eq(users.phone, phone),
      })
    }),

  createUser: mutation(users)
    .input({
      data: z.object({
        name: z.string(),
        phone: z.string(),
      }),
    })
    .resolve(async ({ data }) => {
      const [user] = await db.insert(users).values(data).returning()
      return user
    }),
})
