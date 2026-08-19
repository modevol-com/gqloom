import { field, resolver, weave } from "@gqloom/core"
import { jsonSilk } from "@gqloom/json"

const Giraffe = jsonSilk({
  title: "Giraffe",
  type: "object",
  properties: {
    name: { type: "string" },
    birthday: { type: "string", format: "date-time" },
  },
  required: ["name", "birthday"],
})

const helloResolver = resolver.of(Giraffe, {
  age: field(jsonSilk({ type: "integer" }))
    .input(
      jsonSilk({
        type: "object",
        properties: {
          currentDate: {
            type: "string",
            format: "date-time",
            default: new Date().toISOString(),
          },
        },
      })
    )
    .resolve((giraffe, { currentDate }) => {
      return (
        new Date(currentDate).getFullYear() -
        new Date(giraffe.birthday).getFullYear()
      )
    }),
})

export const schema = weave(helloResolver)
