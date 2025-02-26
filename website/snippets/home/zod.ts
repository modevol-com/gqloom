import { field, resolver, weave } from "@gqloom/core"
import { ZodWeaver } from "@gqloom/zod"
import { z } from "zod"

const Giraffe = z.object({
  __typename: z.literal("Giraffe").nullish(),
  name: z.string().describe("The giraffe's name"),
  birthday: z.date(),
})

const giraffeResolver = resolver.of(Giraffe, {
  age: field(z.number().int())
    .input({
      currentDate: z.coerce
        .date()
        .nullish()
        .transform((x) => x ?? new Date()),
    })
    .resolve((giraffe, { currentDate }) => {
      return currentDate.getFullYear() - giraffe.birthday.getFullYear()
    }),
})

export const schema = weave(ZodWeaver, giraffeResolver)
