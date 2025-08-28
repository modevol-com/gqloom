// @paths: {"src/*": ["snippets/guide-zod/src/*"]}
import { field, resolver } from "@gqloom/core"
import { drizzleResolverFactory } from "@gqloom/drizzle"
import { db } from "src/providers"
import { cats } from "src/schema"
import * as z from "zod"

const catResolverFactory = drizzleResolverFactory(db, "cats")

export const catResolver = resolver.of(cats, {
  cats: catResolverFactory.selectArrayQuery(),

  age: field(z.number().int())
    .derivedFrom("birthday")
    .input({
      currentYear: z
        .number()
        .int()
        .nullish()
        .transform((x) => x ?? new Date().getFullYear()),
    })
    .resolve((cat, { currentYear }) => {
      return currentYear - cat.birthday.getFullYear()
    }),
})
