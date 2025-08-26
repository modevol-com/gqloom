// @paths: {"src/*": ["snippets/guide-zod/src/*"]}
import { mutation, query, resolver } from "@gqloom/core"
import { eq } from "drizzle-orm"
import { db } from "src/providers"
import { users } from "src/schema"
import * as v from "valibot"

export const userResolver = resolver.of(users, {
  usersByName: query(users.$list())
    .input({ name: v.string() })
    .resolve(({ name }) => {
      return db.query.users.findMany({
        where: eq(users.name, name),
      })
    }),

  userByPhone: query(users.$nullable())
    .input({ phone: v.string() })
    .resolve(({ phone }) => {
      return db.query.users.findFirst({
        where: eq(users.phone, phone),
      })
    }),

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
