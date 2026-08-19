import { type Middleware, silk } from "@gqloom/core"
import { GraphQLError } from "graphql"

export const outputValidator: Middleware = async (opts) => {
  const output = await opts.next()
  const result = await silk.parse(opts.outputSilk, output)
  if (result.issues) {
    throw new GraphQLError(result.issues[0].message, {
      extensions: { issues: result.issues },
    })
  }
  return result.value
}
