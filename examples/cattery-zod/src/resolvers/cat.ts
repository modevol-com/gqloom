import { field, resolver } from "@gqloom/core"
import { drizzleResolverFactory } from "@gqloom/drizzle"
import * as z from "zod"
import { useCurrentUser } from "../contexts"
import { db } from "../providers"
import { cats } from "../schema"

const catResolverFactory = drizzleResolverFactory(db, "cats")

export const catResolver = resolver.of(cats, {
  cats: catResolverFactory.selectArrayQuery(),

  age: field(z.int())
    .derivedFrom("birthday")
    .input({
      currentYear: z
        .int()
        .nullish()
        .transform((x) => x ?? new Date().getFullYear()),
    })
    .resolve((cat, { currentYear }) => {
      return currentYear - cat.birthday.getFullYear()
    }),

  owner: catResolverFactory.relationField("owner"),

  createCats: catResolverFactory.insertArrayMutation({
    input: z.object({
      values: z
        .object({
          name: z.string(),
          birthday: z.coerce.date(),
        })
        .transform(async ({ name, birthday }) => ({
          name,
          birthday,
          ownerId: (await useCurrentUser()).id,
        }))
        .array(),
    }),
  }),
})
