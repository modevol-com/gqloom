import { field, resolver, weave } from "@gqloom/core"
import { YupWeaver } from "@gqloom/yup"
import { date, number, object, string } from "yup"

const Giraffe = object({
  name: string().required().meta({ description: "The giraffe's name" }),
  birthday: date().required(),
}).label("Giraffe")

const giraffeResolver = resolver.of(Giraffe, {
  age: field(number().integer().nonNullable())
    .input({
      currentDate: date().default(() => new Date()),
    })
    .resolve((giraffe, { currentDate }) => {
      return currentDate.getFullYear() - giraffe.birthday.getFullYear()
    }),
})

export const schema = weave(YupWeaver, giraffeResolver)
