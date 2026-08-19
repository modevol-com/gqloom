import { field, resolver, weave } from "@gqloom/core"
import { EffectWeaver } from "@gqloom/effect"
import { Schema } from "effect"

const standard = Schema.standardSchemaV1

const Giraffe = standard(
  Schema.Struct({
    name: Schema.String.annotations({ description: "The giraffe's name" }),
    birthday: Schema.Date,
  }).annotations({
    title: "Giraffe",
  })
)

const giraffeResolver = resolver.of(Giraffe, {
  age: field(standard(Schema.Number))
    .input({
      currentDate: standard(Schema.NullOr(Schema.String)),
    })
    .resolve((giraffe, input) => {
      const currentDate = input.currentDate
        ? new Date(input.currentDate)
        : new Date()
      return currentDate.getFullYear() - giraffe.birthday.getFullYear()
    }),
})

export const schema = weave(EffectWeaver, giraffeResolver)
