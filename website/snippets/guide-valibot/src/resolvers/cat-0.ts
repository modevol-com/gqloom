// @paths: {"src/*": ["snippets/guide-zod/src/*"]}
import { field, resolver } from "@gqloom/core"
import { drizzleResolverFactory } from "@gqloom/drizzle"
import { db } from "src/providers"
import { cats } from "src/schema"
import * as v from "valibot"

const catResolverFactory = drizzleResolverFactory(db, cats)

export const catResolver = resolver.of(cats, {
  cats: catResolverFactory.selectArrayQuery(),

  age: field(v.pipe(v.number()))
    .derivedFrom("birthday")
    .input({
      currentYear: v.nullish(v.pipe(v.number(), v.integer()), () =>
        new Date().getFullYear()
      ),
    })
    .resolve((cat, { currentYear }) => {
      return currentYear - cat.birthday.getFullYear()
    }),
})
