```ts twoslash tab="valibot"
import { field, resolver, weave } from "@gqloom/core"
import { ValibotWeaver } from "@gqloom/valibot"
import * as v from "valibot"

const Giraffe = v.object({
  __typename: v.nullish(v.literal("Giraffe")),
  name: v.pipe(v.string(), v.description("The giraffe's name")),
  birthday: v.date(),
})

const giraffeResolver = resolver.of(Giraffe, {
  age: field(v.pipe(v.number(), v.integer()))
    .input({
      currentDate: v.pipe(
        v.nullish(v.string(), () => new Date().toISOString()),
        v.transform((x) => new Date(x))
      ),
    })
    .resolve((giraffe, { currentDate }) => {
      return currentDate.getFullYear() - giraffe.birthday.getFullYear()
    }),
})

export const schema = weave(ValibotWeaver, giraffeResolver)
```

```ts twoslash tab="zod"
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
```