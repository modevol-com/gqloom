import { field, resolver } from "@gqloom/core"
import { drizzleResolverFactory } from "@gqloom/drizzle"
import * as v from "valibot"
import { useCurrentUser } from "../contexts"
import { db } from "../providers"
import { cats } from "../schema"

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

  owner: catResolverFactory.relationField("owner"),

  insertCats: catResolverFactory.insertArrayMutation(),

  createManyCats: catResolverFactory.insertArrayMutation({
    input: v.pipeAsync(
      v.objectAsync({
        values: v.arrayAsync(
          v.pipeAsync(
            v.object({
              name: v.string(),
              birthday: v.pipe(
                v.string(),
                v.transform((x) => new Date(x))
              ),
            }),
            v.transformAsync(async ({ name, birthday }) => ({
              name,
              birthday,
              ownerId: (await useCurrentUser()).id,
            }))
          )
        ),
      })
    ),
  }),
})
