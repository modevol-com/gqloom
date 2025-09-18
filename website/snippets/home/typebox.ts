import type { GraphQLSilk } from "@gqloom/core"
import { JSONWeaver } from "@gqloom/json"
import type { Static, TSchema } from "typebox"

export function typeSilk<T extends TSchema>(
  type: T
): T & GraphQLSilk<Static<T>, Static<T>> {
  return JSONWeaver.unravel(type) as T & GraphQLSilk<Static<T>, Static<T>>
}

// ---cut---
import { field, resolver, weave } from "@gqloom/core"
import { Type } from "typebox"

const Giraffe = typeSilk(
  Type.Object(
    {
      name: Type.String(),
      birthday: Type.String(),
    },
    { title: "Giraffe" }
  )
)

const giraffeResolver = resolver.of(Giraffe, {
  age: field(typeSilk(Type.Integer()))
    .input(
      typeSilk(
        Type.Object({
          currentDate: Type.Optional(Type.String()),
        })
      )
    )
    .resolve((giraffe, { currentDate }) => {
      return (
        (currentDate ? new Date(currentDate) : new Date()).getFullYear() -
        new Date(giraffe.birthday).getFullYear()
      )
    }),
})

export const schema = weave(giraffeResolver)
